document.addEventListener("DOMContentLoaded", () => {
    const workingTimeInput = document.getElementById("workingTime");
    const breakTimeInput = document.getElementById("breakTime");
    const popupTypeSelect = document.getElementById("popupType");
    const statusText = document.getElementById("status");

    // 設定を読み込む
    chrome.storage.local.get(["working_time", "break_time", "popup_type"], (data) => {
        workingTimeInput.value = data.working_time ?? 25;
        breakTimeInput.value = data.break_time ?? 5;
        popupTypeSelect.value = data.popup_type ?? "notification";
    });

    // 設定を保存
    document.getElementById("saveOptions").addEventListener("click", () => {
        const workingTime = parseInt(workingTimeInput.value) || 25;
        const breakTime = parseInt(breakTimeInput.value) || 5;
        const popupType = popupTypeSelect.value;

        chrome.storage.local.set(
            { working_time: workingTime, break_time: breakTime, popup_type: popupType },
            () => {
                statusText.textContent = "設定を保存しました！";
                setTimeout(() => (statusText.textContent = ""), 2000);
            }
        );
    });
});