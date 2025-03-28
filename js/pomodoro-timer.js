// 初期化
const dateInfo = document.getElementById('pomodoroDate');
const startTimer = document.getElementById('pomodoroStart');
const stopTimer = document.getElementById('pomodoroStop');
const pomodoroWorking = document.getElementById('pomodoroWorking');
const pomodoroBreak = document.getElementById('pomodoroBreak');

let timerMsg = chrome.i18n.getMessage("initMessage");

// タイマー表示更新関数
function updateTimerDisplay() {
    chrome.storage.local.get(["remaining_time", "timer_message"], (data) => {
        const remaining_time = data.remaining_time ?? 0;
        const hours = Math.floor(remaining_time / 3600); // 時間の計算 (1時間 = 3600秒)
        const minutes = Math.floor((remaining_time % 3600) / 60).toString().padStart(2, "0"); // 分の計算 (残り時間 % 3600秒で分を計算)
        const seconds = (remaining_time % 60).toString().padStart(2, "0"); // 秒の計算

        timerMsg = data.timer_message ?? timerMsg;
        dateInfo.innerHTML = `${timerMsg}${hours > 0 ? hours + ':' : ''}${minutes}:${seconds}`;
    });
}

chrome.storage.onChanged.addListener((changes, _namespace) => {
    if (changes.remaining_time) updateTimerDisplay();
});

// 初期化時にタイマー表示を呼び出し
window.addEventListener("DOMContentLoaded", function () {
    document.getElementById('pomodoroName').innerText = chrome.i18n.getMessage("actionTitle");
    document.getElementById('pomodoroWorkTime').innerText = chrome.i18n.getMessage("pomodoroWorkTime");
    document.getElementById('pomodoroBreakTime').innerText = chrome.i18n.getMessage("pomodoroBreakTime");
    chrome.storage.local.get(["working_time", "break_time", "popup_type"], (data) => {
        pomodoroWorking.value = data.working_time ?? 25;
        pomodoroBreak.value = data.break_time ?? 5;
        if (!data.popup_type) {
            // popup_typeが存在しない場合、デフォルト値を設定
            chrome.storage.local.set({ popup_type: "notification" }, () => {
                console.log("popup_type set to default 'notification'");
            });
        }
    });
    // 初回のタイマー表示更新
    updateTimerDisplay();
});

// 開始の処理
startTimer.addEventListener('click', async _event => {
    const workingTime = parseInt(pomodoroWorking.value) || 25;
    const breakTime = parseInt(pomodoroBreak.value) || 5;
    chrome.runtime.sendMessage(
        { switch: "on", working_time: workingTime, break_time: breakTime },
        (response) => { console.log(response.status); }
    );
});

// 終了の処理
stopTimer.addEventListener('click', async _event => {
    chrome.runtime.sendMessage({ switch: "stop" }, (response) => {
        console.log(response.status);
    });
    updateTimerDisplay();
});
