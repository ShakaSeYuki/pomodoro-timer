    // 初期化
    let tid = null;
    let workingMin = 25;
    let breakMin = 5;
    let workingCount = 1;
    let breakCount = 1;
    let timerMsg = 'startを押すと作業開始です。';

    // ポモドーロタイマーの設定
    function PomodoroTimer(elment, pomodoroTime, message) {
        this.initialize.apply(this, arguments);
    }

    PomodoroTimer.prototype = {
        // 初期化
        initialize: function (elment, pomodoroTime, message) {
            this.elem = elment;
            this.pomodoroTime = pomodoroTime;
            this.message = message;
        },
        countDown: function (workingFlg) {
            pomodoroStop();
            timerMsg = '';
            let today = new Date();
            let day = Math.floor((this.pomodoroTime - today) / (24 * 60 * 60 * 1000));
            let hour = Math.floor((day * 24) + ((this.pomodoroTime - today) % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            let min = Math.floor(((this.pomodoroTime - today) % (24 * 60 * 60 * 1000)) / (60 * 1000)) % 60;
            let sec = Math.floor(((this.pomodoroTime - today) % (24 * 60 * 60 * 1000)) / 1000) % 60 % 60;
            let pt = this;
            if ((this.pomodoroTime - today) > 0) {
                if (hour) timerMsg += '<span class="pomodoro_num">' + hour + '</span><small>時間</small>';
                timerMsg += '<span class="pomodoro_num">' + this.addZero(min) + '</span><small>分</small><span class="pomodoro_num">' + this.addZero(sec) + '</span><small>秒</small>';
                timerMsg = this.elem + timerMsg;
                dispTimer();
                tid = setTimeout(() => {
                    pt.countDown(workingFlg);
                }, 10);
            } else {
                if(workingFlg) {
                    if(confirm(this.message)) {
                        workingFlg = false;
                        workingCount++;
                        pomodoroStart(workingMin, breakMin, workingFlg);
                    } else {
                        setStopAction();
                    }
                } else {
                    if(confirm(this.message)) {
                        workingFlg = true;
                        breakCount++;
                        pomodoroStart(workingMin, breakMin, workingFlg);
                    } else {
                        setStopAction();
                    }
                }
                return;
            }
        },
        addZero: function (num) {
            return ('0' + num).slice(-2);
        }
    }

    // スタート
    pomodoroStart = (wmin, bmin, workingFlg) => {
        let min;
        let text;
        let endText;
        workingMin = (!wmin) ? workingMin: wmin;
        breakMin = (!bmin) ? breakMin: bmin;
        // 作業か休憩かの判別
        if (workingFlg) {
            min = workingMin;
            text = workingCount + '回目の作業終了まで：';
            endText = workingCount + '回目の作業が終了しました。OKボタンを押して休憩しましょう。\nポモドーロタイマーを終了したい場合は\nキャンセルボタンを押してください。';
        } else if (!workingFlg) {
            min = breakMin;
            text = breakCount + '回目の休憩終了まで：';
            endText = breakCount + '回目の休憩が終了しました。OKボタンを押して作業を開始しましょう。\nポモドーロタイマーを終了したい場合は\nキャンセルボタンを押してください。';
        }
        // 時間をセット
        let pomodoroTime = new Date();
        pomodoroTime.setMinutes(pomodoroTime.getMinutes() + Number(min));
        let timer = new PomodoroTimer(text, pomodoroTime, endText);
        timer.countDown(workingFlg);
    }

    // タイマーの停止
    pomodoroStop = () => {
        if(tid !== null) {
            clearTimeout(tid);
            tid = null;
        }
    }

    // タイマー表示
    dispTimer = () => {
        return timerMsg;
    }

    // 設定時間取得
    getCountData = () => {
        return countData = {
            workingMin : workingMin,
            breakMin : breakMin
        };
    }

    // 停止後の処理
    setStopAction = () => {
        timerMsg = '停止しました。';
        workingCount = 1;
        breakCount = 1;
    }