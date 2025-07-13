// main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron'); // shellを追加
const path = require('path');
const fs = require('fs');

let mainWindow;
const SETTINGS_FILE_NAME = 'table-presets.json';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    mainWindow.loadFile('index.html');

    // 開発ツールを開く (必要であれば)
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 設定ファイルのパスを取得
function getSettingsFilePath() {
      const documentsPath = app.getPath('documents');
  return path.join(documentsPath, 'open_table', SETTINGS_FILE_NAME);
}

// IPCハンドラー: フォルダを開くダイアログ
ipcMain.handle('open-folder-dialog', async (event) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (canceled) {
        return null;
    } else {
        return filePaths[0];
    }
});

// IPCハンドラー: プリセットを保存
ipcMain.handle('save-presets', async (event, presets) => {
    const filePath = getSettingsFilePath();
    try {
        fs.writeFileSync(filePath, JSON.stringify(presets, null, 2), 'utf-8');
        return { success: true, message: 'プリセットが保存されました。' };
    } catch (error) {
        console.error('プリセットの保存に失敗しました:', error);
        return { success: false, message: `プリセットの保存に失敗しました: ${error.message}` };
    }
});

// IPCハンドラー: プリセットを読み込む
ipcMain.handle('load-presets', async (event) => {
    const filePath = getSettingsFilePath();
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            return { success: true, presets: JSON.parse(data) };
        } else {
            return { success: true, presets: {} };
        }
    } catch (error) {
        console.error('プリセットの読み込みに失敗しました:', error);
        return { success: false, message: `プリセットの読み込みに失敗しました: ${error.message}` };
    }
});

// --- 新規追加 IPC ハンドラー: 結合文字列からフォルダを作成・開く ---
ipcMain.handle('create-and-open-folder', async (event, { combinedString, presetName }) => {
    if (!combinedString || !presetName) {
        return { success: false, message: '必要な情報が不足しています。' };
    }

    const documentsPath = app.getPath('documents');
    const baseFolder = path.join(documentsPath, 'open_table');
    const targetFolder = path.join(baseFolder, presetName, combinedString);

    try {
        // 多段フォルダを再帰的に作成
        fs.mkdirSync(targetFolder, { recursive: true });
        console.log(`フォルダが作成または既に存在します: ${targetFolder}`);

        // フォルダをOSのファイルエクスプローラーで開く
        shell.openPath(targetFolder);
        return { success: true, message: `フォルダを開きました: ${targetFolder}` };
    } catch (error) {
        console.error(`フォルダの作成またはオープンに失敗しました: ${error}`);
        return { success: false, message: `フォルダの操作に失敗しました: ${error.message}` };
    }
});

ipcMain.handle('check-folder-for-files', async (event, { presetName, combinedString }) => {
    try {
        
        let documentsPath = app.getPath('documents')
        const folderPath = path.join(documentsPath,"open_table", presetName, combinedString);
        console.log("実際のパス"  + folderPath);
        if (!fs.existsSync(folderPath)) {
            return { success: true, hasFiles: false, message: `フォルダが見つかりません: ${folderPath}` };
        }

        const files = await fs.promises.readdir(folderPath);
        const hasFiles = files.length > 0;
        return { success: true, hasFiles: hasFiles, message: hasFiles ? 'ファイルが存在します。' : 'ファイルはありません。' };
    } catch (error) {
        console.error('フォルダ内のファイルチェック中にエラーが発生しました:', error);
        return { success: false, message: `フォルダ内のファイルチェック中にエラーが発生しました: ${error.message}` };
    }
});