let lifeline;
let stopId;

async function startAlarm(name, duration) {
    await chrome.alarms.create(name, { delayInMinutes: 0.01 });
}

//start・stopボタン押された時の処理
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.switch === "on") {
        const workingTime = message.working_time || 25; // 作業時間 (分)
        const breakTime = message.break_time || 5; // 休憩時間 (分)
        chrome.alarms.create("pomodoro_working", { delayInMinutes: workingTime });
        chrome.storage.local.set({
            timerStatus: true,
            working_time: workingTime,
            break_time: breakTime,
            current_phase: "working", // 作業フェーズ
        });
        sendResponse({ status: "タイマーが開始されました" });
    } else if (message.switch === "stop" || message.switch === "reset") {
        chrome.alarms.clearAll(() => {
            chrome.storage.local.set({ timerStatus: false });
            sendResponse({ status: "タイマーが停止されました" });
        });
    }
    return true; // 非同期応答のためにメッセージチャネルを維持
});

//5分間の再接続処理
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'keepAlive') {
        lifeline = port;
        // 切断時の処理
        port.onDisconnect.addListener(() => {
            keepAlive(true);
        });
    }
});

const keepAlive = (forced = false) => {
    let lifeline;
    if (lifeline && !forced) {
        return; // すでに接続が存在する場合、再接続しない
    }
    try {
        lifeline = chrome.runtime.connect({ name: 'keepAlive' });
        lifeline.onDisconnect.addListener(() => {
            keepAlive(true);
        });
    } catch (error) {
        console.error("keepAlive 接続中にエラーが発生しました:", error);
    }
};

// 通知を表示する関数
function showNotification(title, message, alarmName, delayInMinutes, current_phase) {
    chrome.notifications.create("pomodoro_timer", {
        type: "basic",
        iconUrl: "/img/icon48.png",
        title: title,
        message: message,
        buttons: [
            { title: "OK" },
            { title: "ポモドーロタイマーを終了" }
        ],
        priority: 2,
    }, (notificationId) => {
        if (chrome.runtime.lastError) {
            console.error("通知作成エラー:", chrome.runtime.lastError.message);
        } else {
            chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
                if (notifId === notificationId) {
                    if (btnIdx === 0) {
                        // 次のサイクルを開始
                        chrome.alarms.create(alarmName, { delayInMinutes: delayInMinutes });
                        chrome.storage.local.set({ current_phase: current_phase });
                    } else if (btnIdx === 1) {
                        stopPomodoroTimer();
                    }
                }
            });
        }
    });
}

// タイマーの停止
function stopPomodoroTimer() {
    chrome.alarms.clearAll(() => {
        console.log("全てのタイマーが停止されました");
    });
    chrome.storage.local.set({
        timerStatus: false,
        current_phase: null,
        working_count: 1,
        break_count: 1,
    });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
    const data = await chrome.storage.local.get(["working_time", "break_time", "current_phase"]);
    if (alarm.name === "pomodoro_working") {
        chrome.alarms.clearAll(() => {
            showNotification(
                "ポモドーロタイマー",
                `${data.working_time}分の作業が終了しました。OKボタンを押して休憩を開始しましょう。`,
                "pomodoro_break",
                data.break_time,
                "break"
            );
        });
    } else if (alarm.name === "pomodoro_break") {
        chrome.alarms.clearAll(() => {
            showNotification(
                "ポモドーロタイマー",
                `${data.break_time}分の休憩が終了しました。OKボタンを押して作業を開始しましょう。`,
                "pomodoro_working",
                data.working_time,
                "working"
            );
        });
    }
});