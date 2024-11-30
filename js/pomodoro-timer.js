// 初期化
let tid = null;
let workingFlg = true;
let stopTimerFlg = false;
let dateInfo = document.getElementById('pomodoroDate');
let startTimer = document.getElementById('pomodoroStart');
let stopTimer = document.getElementById('pomodoroStop');
let pomodoroWorking = document.getElementById('pomodoroWorking');
let pomodoroBreak = document.getElementById('pomodoroBreak');
let workingMin = 25;
let breakMin = 5;
let workingCount = 1;
let breakCount = 1;
let timerMsg = initMsg;
const secondTime = 60;

async function startAlarm(name, duration) {
    chrome.alarms.create(name, { delayInMinutes: duration });
}

// タイマー表示更新関数
function updateTimerDisplay() {
    if(dateInfo) {
        if (timerMsg) {
            dateInfo.innerHTML = timerMsg;
        } else {
            dateInfo.innerHTML = "タイマーは開始されていません";
        }
    }
}

setInterval(updateTimerDisplay, 1000);

// タイマーリスナー設定
function initializeAlarmListener() {
    chrome.alarms.onAlarm.addListener((_alarm) => {
        // タイマーの表示を更新
        updateTimerDisplay();
    });
}

// 初期化時にタイマー表示を呼び出し
window.addEventListener("DOMContentLoaded", function () {
    // タイマーリスナーを初期化
    initializeAlarmListener();
    // 初回のタイマー表示更新
    updateTimerDisplay();
});

// 開始の処理
startTimer.addEventListener('click', async _event => {
    const workingTime = parseInt(document.getElementById("pomodoroWorking").value) || 25;
    const breakTime = parseInt(document.getElementById("pomodoroBreak").value) || 5;
    chrome.runtime.sendMessage(
        { switch: "on", working_time: workingTime, break_time: breakTime },
        (response) => {
            console.log(response.status);
        }
    );
    workingFlg = true;
    timerStatus = true;
    chrome.storage.local.set({
        timerStatus,
        working_time: pomodoroWorking.value,
        working_second: pomodoroWorking.value * secondTime,
        constant_working_second: pomodoroWorking.value * secondTime,
        break_time: pomodoroBreak.value,
        break_second: pomodoroBreak.value * secondTime,
        constant_break_second: pomodoroBreak.value * secondTime,
    });
    pomodoroStart(pomodoroWorking.value, pomodoroBreak.value, workingFlg);
    popup_pomodoro_timer();
    stopTimerFlg = false;
});

pomodoroStart = (_wmin, _bmin, workingFlg) => {
    // 既存のタイマーを停止
    pomodoroStop();
    chrome.storage.local.get(
        ["working_count", "working_time", "break_count", "break_time"],
        ({ working_count, working_time, break_count, break_time }) => {
            const min = workingFlg ? working_time : break_time;
            const count = workingFlg ? working_count : break_count;
            const startText = `${count}回目の${workingFlg ? "作業" : "休憩"}終了まで:`;
            const endText = `${count}回目の${workingFlg ? "作業" : "休憩"}が終了しました。OKボタンを押して${workingFlg ? "休憩" : "作業"}を開始しましょう。`;
            // タイマーの終了時間を計算
            const pomodoroTime = new Date(Math.ceil((Date.now() + min * 60 * 1000) / 1000) * 1000);
            // PomodoroTimer インスタンスを生成してカウントダウンを開始
            const timer = new PomodoroTimer(dateInfo, pomodoroTime, startText, endText);
            timer.countDown(workingFlg);
        }
    );
};

// 終了の処理
stopTimer.addEventListener('click', async _event => {
    chrome.runtime.sendMessage({ switch: "stop" }, (response) => {
        console.log(response.status);
    });
    stopTimerFlg = true;
    pomodoroStop();
    setStopAction();
});

// タイマーの停止
pomodoroStop = () => {
    clearTimeout(tid);
    tid = null;
}

function setStopAction() {
    stopTimerFlg = true; // 停止フラグをオン
    timerMsg = "停止しました。";
    chrome.alarms.clearAll(() => {
        console.log("全てのタイマーが停止されました");
    });
    chrome.storage.local.set({
        timerStatus: false,
        current_phase: null,
        timer_message: timerMsg,
        working_count: 1,
        break_count: 1,
    });
    updateTimerDisplay();
}

// ポモドーロタイマーの設定
const PomodoroTimer = class {
    constructor(element, pomodoroTime, startMsg, endMsg) {
        this.elem = element;
        this.pomodoroTime = pomodoroTime;
        this.startMsg = startMsg;
        this.endMsg = endMsg;
    }
    countDown(workingFlg) {
        // タイマーの初期化
        pomodoroStop(); // 既存のタイマーを停止
        timerMsg = this.startMsg; // タイマーのメッセージを初期化

        // 時刻差の計算
        const currentTime = Date.now();
        const alarmTime = new Date(this.pomodoroTime).getTime();
        const timeDiff = (alarmTime - currentTime) / 1000; // 秒単位の差分

        if (isNaN(timeDiff)) {
            console.error("timeDiff が NaN です。計算対象の値を確認してください。");
        }

        if (timeDiff > 0) {
            // 残り時間の計算
            const hour = Math.floor(timeDiff / (60 * 60));
            const min = Math.floor((timeDiff % (60 * 60)) / 60);
            const sec = Math.floor(timeDiff % 60);

            // 表示用のメッセージを生成
            if (hour > 0) {
                timerMsg += `<span class="pomodoro_num">${hour}</span><small>時間</small>`;
            }
            timerMsg += `<span class="pomodoro_num">${this.addZero(min)}</span><small>分</small>`;
            timerMsg += `<span class="pomodoro_num">${this.addZero(sec)}</span><small>秒</small>`;

            // 表示を更新
            updateTimerDisplay();

            // 再帰的にカウントダウンを実行
            tid = setTimeout(() => this.countDown(workingFlg), 1000);
        } else {
            // アラームをクリアする
            chrome.alarms.clearAll(() => {
                // 通知を表示
                chrome.notifications.create("pomodoro_timer", {
                    type: "basic",
                    iconUrl: "img/icon48.png",
                    title: "タイマー終了",
                    message: this.endMsg,
                    buttons: [
                        { title: "OK" },
                        { title: "ポモドーロタイマーを終了" }
                    ],
                    priority: 2,
                }, (notificationId) => {
                    if (chrome.runtime.lastError) {
                        console.error("通知作成エラー:", chrome.runtime.lastError.message);
                    } else {
                        // 通知のクリックイベントを処理
                        chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
                            if (notifId === notificationId) {
                                if (btnIdx === 0) {
                                    // OKが押された場合
                                    if (workingFlg) {
                                        workingFlg = false;
                                        workingCount++;
                                        chrome.storage.local.set({ working_count: workingCount });
                                        pomodoroStart(breakMin, breakMin, workingFlg);
                                    } else {
                                        workingFlg = true;
                                        breakCount++;
                                        chrome.storage.local.set({ break_count: breakCount });
                                        pomodoroStart(workingMin, workingMin, workingFlg);
                                    }
                                } else if (btnIdx === 1) {
                                    // キャンセルが押された場合
                                    setStopAction();
                                }
                            }
                        });
                    }
                });
            });
        }
    }
    addZero = (num) => ('0' + num).slice(-2);
}

// 通知操作時にのみ次のアラームをスケジュール
function handlePhaseSwitch(currentPhase) {
    chrome.storage.local.get(["working_time", "break_time"], (data) => {
        if (currentPhase === "working") {
            chrome.storage.local.set({ current_phase: "break" });
            chrome.alarms.create("pomodoro_break", { delayInMinutes: data.break_time });
        } else if (currentPhase === "break") {
            chrome.storage.local.set({ current_phase: "working" });
            chrome.alarms.create("pomodoro_working", { delayInMinutes: data.working_time });
        }
    });
}

function popup_pomodoro_timer() {
    chrome.runtime.onMessage.addListener(function(request, _sender, sendResponse){
        if(request.interval_second == 0 && request.elapsed_time == request.total_second){
            reset();
        } else {
            pomodoroStart(request.working_time, request.break_time, request.timerStatus);
        }
        sendResponse();
        return true;
    });
}
