package com.faso.express;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseOptions options = new FirebaseOptions.Builder()
                    .setApplicationId("1:842669314453:android:54cb06fd754b315d8b269c")
                    .setApiKey("AIzaSyAeSdgUKfKpt_CRMJwjj_wT0x0rsqsmoQM")
                    .setProjectId("fasoexpress-2f11e")
                    .build();
                FirebaseApp.initializeApp(this, options);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
