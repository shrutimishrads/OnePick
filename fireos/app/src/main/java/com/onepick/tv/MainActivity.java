package com.onepick.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Fire OS Fullscreen Leanback TV Activity.
 * Hosts the OnePick 10-foot UI and maps Fire TV remote hardware keys
 * (D-Pad UP/DOWN/LEFT/RIGHT, CENTER/OK, BACK, PLAY/PAUSE).
 */
public class MainActivity extends Activity {

    // =========================================================================
    // CONFIGURATION: Reviewer Server URL Constant
    // For Android/Fire TV Emulator: "http://10.0.2.2:3000" connects to host machine.
    // For Physical Fire TV Stick: set to your local LAN IP (e.g., "http://192.168.1.50:3000")
    // Can also be overridden at runtime via: adb shell am start -n com.onepick.tv/.MainActivity --es url "http://YOUR_IP:3000"
    // =========================================================================
    public static final String SERVER_URL = "http://10.0.2.2:3000";

    private WebView mWebView;
    private volatile boolean mIsModalOpen = false;

    public class WebAppInterface {
        @JavascriptInterface
        public void setModalOpen(boolean open) {
            mIsModalOpen = open;
        }

        @JavascriptInterface
        public boolean isModalOpen() {
            return mIsModalOpen;
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on during TV viewing session
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        mWebView = new WebView(this);
        setContentView(mWebView);

        WebSettings settings = mWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        // Enable remote debugging for TV inspection
        WebView.setWebContentsDebuggingEnabled(true);

        mWebView.addJavascriptInterface(new WebAppInterface(), "OnePickNative");
        mWebView.setWebViewClient(new WebViewClient());
        mWebView.setWebChromeClient(new WebChromeClient());

        // TV spatial navigation configuration
        mWebView.setFocusable(true);
        mWebView.setFocusableInTouchMode(true);
        mWebView.requestFocus();

        // Check if custom URL was passed via intent extras, fallback to configurable SERVER_URL constant
        String targetUrl = SERVER_URL;
        if (getIntent() != null && getIntent().hasExtra("url")) {
            targetUrl = getIntent().getStringExtra("url");
        }

        mWebView.loadUrl(targetUrl);
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_UP:
                dispatchJsKey("ArrowUp");
                return true;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                dispatchJsKey("ArrowDown");
                return true;
            case KeyEvent.KEYCODE_DPAD_LEFT:
                dispatchJsKey("ArrowLeft");
                return true;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                dispatchJsKey("ArrowRight");
                return true;
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
                dispatchJsKey("Enter");
                return true;
            case KeyEvent.KEYCODE_BACK:
                // Only consume BACK when web UI modal is open; otherwise exit app
                if (mIsModalOpen) {
                    mIsModalOpen = false;
                    mWebView.evaluateJavascript("if (typeof window.onepickHandleBack === 'function') { window.onepickHandleBack(); }", null);
                    return true;
                }
                return super.onKeyDown(keyCode, event);
            case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
            case KeyEvent.KEYCODE_MEDIA_PLAY:
                dispatchJsKey("PlayPause");
                return true;
            default:
                return super.onKeyDown(keyCode, event);
        }
    }

    private void dispatchJsKey(String keyName) {
        if (mWebView != null) {
            String js = "window.dispatchEvent(new KeyboardEvent('keydown', { key: '" + keyName + "', bubbles: true }));";
            mWebView.evaluateJavascript(js, null);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (mWebView != null) {
            mWebView.onResume();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (mWebView != null) {
            mWebView.onPause();
        }
    }
}
