//5分間の再接続処理
let lifeline;

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'keepAlive') {
        lifeline = port;
        // 切断時の処理
        port.onDisconnect.addListener(() => keepAlive(true));
    }
});

const keepAlive = (forced = false) => {
    if (lifeline && !forced) return; // すでに接続が存在する場合、再接続しない
    try {
        lifeline = chrome.runtime.connect({ name: 'keepAlive' });
        lifeline.onDisconnect.addListener(() => keepAlive(true));
    } catch (error) {
        console.error("keepAlive 接続中にエラーが発生しました:", error);
    }
};

//start・stopボタン押された時の処理
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const workingTime = message.working_time || 25; // 作業時間 (分)
    const breakTime = message.break_time || 5; // 作業時間 (分)
    if (message.switch === "on") {
        chrome.alarms.create("pomodoro_working", { delayInMinutes: workingTime });
        startPomodoroTimer(workingTime, breakTime);
        sendResponse({ status: "タイマーが開始されました" });
    } else if (message.switch === "stop") {
        chrome.alarms.clearAll(() => {
            stopPomodoroTimer();
            sendResponse({ status: "タイマーが停止されました" });
        });
    } else if (message.switch === "resume") {
        chrome.storage.local.get(["remaining_time"], (data) => {
            resumePomodoroTimer(data.remaining_time);
        });
    }
    return true; // 非同期応答のためにメッセージチャネルを維持
});

// タイマーの開始
let timerInterval;
let remainingTime = 0;

function startPomodoroTimer(workingTime, breakTime) {
    remainingTime = workingTime * 60;
    chrome.storage.local.set({
        timerStatus: true,
        timer_message: chrome.i18n.getMessage("workText"),
        current_phase: "working",
        working_time: workingTime,
        break_time: breakTime,
        remaining_time: remainingTime,
    });
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

// タイマーを1秒ごとに減らす処理
function updateTimer() {
    chrome.storage.local.get(["remaining_time"], (data) => {
        if (data.remaining_time === undefined || data.remaining_time <= 0) {
            return; // 不正な remaining_time の場合は何もしない
        }

        if (data.remaining_time <= 1) { // 0になったらフェーズを切り替え
            switchPhase();
        } else {
            remainingTime = data.remaining_time - 1;
            chrome.storage.local.set({ remaining_time: remainingTime });
        }
    });
}

// フェーズ切り替え処理
function switchPhase() {
    chrome.storage.local.get(["working_time", "break_time", "current_phase"], (data) => {
        clearInterval(timerInterval);
        timerInterval = null;

        const newPhase = data.current_phase === "working" ? "break" : "working";
        remainingTime = newPhase === "working" ? data.working_time * 60 : data.break_time * 60;
        chrome.storage.local.set({
            current_phase: newPhase,
            remaining_time: remainingTime,
            timer_message: newPhase === "working"
                ? chrome.i18n.getMessage("workText")
                : chrome.i18n.getMessage("breakText"),
        });

        showNotification(
            newPhase === "working"
                ? chrome.i18n.getMessage("breakNotificationText")
                : chrome.i18n.getMessage("workNotificationText")
        );
    });
}

// 通知を表示する関数
function showNotification(message) {
    chrome.storage.local.get("popup_type", (data) => {
        if (data.popup_type === "alert") {
            // アクティブなタブにメッセージを送信して `alert()` を実行
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "alert", message: message }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.warn("コンテンツスクリプトが読み込まれていません。", chrome.runtime.lastError.message);
                        } else {
                            console.log("アラートメッセージ送信成功:", response);
                        }
                    });
                }
            });
        } else {
            chrome.notifications.create("pomodoro_timer", {
                type: "basic",
                iconUrl: "/img/icon48.png",
                title: chrome.i18n.getMessage("actionTitle"),
                message: message,
                buttons: [
                    { title: "OK" },
                    { title: chrome.i18n.getMessage("finishButton") }
                ],
                priority: 2,
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error("通知作成エラー:", chrome.runtime.lastError.message);
                }
            });
        }
    });
}

// 通知のボタン処理
chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
    if (notifId === "pomodoro_timer") {
        if (btnIdx === 0) {
            chrome.storage.local.get(["remaining_time"], (data) => {
                resumePomodoroTimer(data.remaining_time);
            });
        } else if (btnIdx === 1) {
            console.log("通知からタイマーが停止されました");
            stopPomodoroTimer();
        }
    }
});

// タイマーの再開（通知後）
function resumePomodoroTimer(time) {
    clearInterval(timerInterval); // 既存のタイマーをクリア
    console.log("タイマーが再開されました");
    remainingTime = time;
    // 新しいカウントダウンを開始
    chrome.storage.local.set({ remaining_time: time }, () => {
        timerInterval = setInterval(updateTimer, 1000);
    });
}

// タイマーの停止
function stopPomodoroTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // 発行済みの通知を削除
    chrome.notifications.clear("pomodoro_timer", () => {
        if (chrome.runtime.lastError) {
            console.error("通知削除エラー:", chrome.runtime.lastError.message);
        }
    });

    chrome.storage.local.set({
        timerStatus: false,
        timer_message: chrome.i18n.getMessage("initMessage"),
        current_phase: null,
        remaining_time: 0,
    });

    remainingTime = 0;
}
