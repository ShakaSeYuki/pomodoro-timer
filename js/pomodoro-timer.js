
    // 初期化
    let bgWindow = chrome.extension.getBackgroundPage();
    let tid = null;
    let workingFlg = true;
    let stopTimerFlg = false;
    let dateInfo = document.getElementById('pomodoroDate');
    let startTimer = document.getElementById('pomodoroStart');
    let stopTimer = document.getElementById('pomodoroStop');
    let pomodoroWorking = document.getElementById('pomodoroWorking');
    let pomodoroBreak = document.getElementById('pomodoroBreak');

    window.addEventListener('load', function() {
        // タイマー表示
        dispTimer();
        // 作業時間と休憩時間のセット
        let data = bgWindow.getCountData();
        pomodoroWorking.value = data.workingMin;
        pomodoroBreak.value = data.breakMin;
    });

    dispTimer = () => {
        setTimeout(() => {
            dateInfo.innerHTML = bgWindow.dispTimer();
            if(!stopTimerFlg) dispTimer();
        }, 10);
    }

    // 開始の処理
    startTimer.addEventListener('click', event => {
        workingFlg = true;
        let workingMin = pomodoroWorking.value;
        let breakMin = pomodoroBreak.value;
        bgWindow.pomodoroStart(workingMin, breakMin, workingFlg);
        if(stopTimerFlg) dispTimer();
        stopTimerFlg = false;
    });

    // 終了の処理
    stopTimer.addEventListener('click', event => {
        stopTimerFlg = true;
        bgWindow.pomodoroStop();
    });