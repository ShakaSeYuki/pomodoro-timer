chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "alert") {
        const userResponse = confirm(`${message.message}\n\nOK: 続行\nキャンセル: ポモドーロタイマーを終了`);
        if (userResponse) {
            // ユーザーが「OK」を押した場合、タイマーを再開
            chrome.runtime.sendMessage({ switch: "resume" });
        } else {
            // ユーザーが「キャンセル」（ポモドーロタイマーを停止）を押した場合
            chrome.runtime.sendMessage({ switch: "stop" });
        }
        sendResponse({ status: "alert displayed", userResponse });
    }
});