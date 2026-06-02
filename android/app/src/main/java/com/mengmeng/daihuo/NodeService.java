package com.mengmeng.daihuo;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.concurrent.Executors;

/**
 * 嵌入式 Node.js 服务
 * 启动时复制 Node.js 运行时和后端代码到数据目录，启动 Next.js 服务器
 */
public class NodeService extends Service {
    private static final String TAG = "NodeService";
    private Process nodeProcess;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "正在启动 Node.js 服务器...");
        startNodeServer();
    }

    private void startNodeServer() {
        Executors.newSingleThreadExecutor().execute(() -> {
            try {
                File dataDir = new File(getFilesDir(), "nodejs-server");
                dataDir.mkdirs();

                // 1. 解压 Node.js 运行时
                File nodeBin = new File(dataDir, "node");
                if (!nodeBin.exists()) {
                    copyAsset("nodejs/node", nodeBin);
                    nodeBin.setExecutable(true);
                }

                // 2. 解压服务端代码
                copyAssetDir("nodejs-project", dataDir);

                // 3. 创建 server.js 入口
                File serverJs = new File(dataDir, "server.js");
                if (!serverJs.exists()) {
                    copyAsset("nodejs-project/server.js", serverJs);
                }

                // 4. 启动 Node.js 服务器
                ProcessBuilder pb = new ProcessBuilder(
                    nodeBin.getAbsolutePath(),
                    "server.js",
                    "--port", "3000"
                );
                pb.directory(dataDir);
                pb.environment().put("NODE_ENV", "production");
                pb.environment().put("PORT", "3000");
                pb.redirectErrorStream(true);

                nodeProcess = pb.start();
                Log.i(TAG, "Node.js 服务器已启动在 localhost:3000");

                // 读取输出日志
                InputStream is = nodeProcess.getInputStream();
                byte[] buffer = new byte[4096];
                int len;
                while ((len = is.read(buffer)) != -1) {
                    Log.d(TAG, new String(buffer, 0, len));
                }

                int exitCode = nodeProcess.waitFor();
                Log.w(TAG, "Node.js 进程退出，代码: " + exitCode);

            } catch (Exception e) {
                Log.e(TAG, "Node.js 启动失败", e);
                stopSelf();
            }
        });
    }

    private void copyAsset(String assetPath, File dest) throws Exception {
        try (InputStream is = getAssets().open(assetPath);
             FileOutputStream os = new FileOutputStream(dest)) {
            byte[] buffer = new byte[8192];
            int len;
            while ((len = is.read(buffer)) != -1) {
                os.write(buffer, 0, len);
            }
        }
    }

    private void copyAssetDir(String assetDir, File destDir) throws Exception {
        String[] files = getAssets().list(assetDir);
        if (files == null) return;
        for (String file : files) {
            File dest = new File(destDir, file);
            if (getAssets().open(assetDir + "/" + file) != null) {
                // 是文件
                copyAsset(assetDir + "/" + file, dest);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (nodeProcess != null) {
            nodeProcess.destroy();
            Log.i(TAG, "Node.js 服务器已停止");
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
