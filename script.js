let selectedLat = null;
let selectedLng = null;
let marker = null;

const coordsEl = document.getElementById("coords");
const addressEl = document.getElementById("address");
const statusEl = document.getElementById("status");
const forecastEl = document.getElementById("forecast");
const fetchWeatherBtn = document.getElementById("fetchWeather");
const setLocationBtn = document.getElementById("setLocation");
const messageEl = document.getElementById("message");
const fetchedTimeEl = document.getElementById("fetchedTime");
// 仮マーカー（グレーっぽい）
const tempMarkerIcon = L.icon({
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    shadowSize: [41, 41],
    className: "temp-marker" // カスタムスタイル用
});

// 正式マーカー（通常アイコン）
const officialMarkerIcon = L.icon({
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    shadowSize: [41, 41],
});

let lastSetTime = 0;
let lastFetchTime = 0;

function normalizeLongitude(lon) {
    return ((lon + 180) % 360 + 360) % 360 - 180;
}

function getFormattedDate(dateStr) {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const weekday = date.toLocaleDateString("ja-JP", { weekday: "short" });
    return `${month}/${day} (${weekday})`;
}

function formatTemp(temp) {
    const sign = temp < 0 ? "-" : " ";
    const abs = Math.abs(temp);
    const intPart = Math.floor(abs);
    const decPart = Math.round((abs - intPart) * 10);
    const tens = intPart >= 10 ? Math.floor(intPart / 10) : " ";
    const ones = intPart % 10;
    return `${sign} ${tens}${ones}.${decPart}°`;
}

// 初期非表示（予報）
window.onload = () => {
    forecastEl.classList.add("hidden");
};

// 地図初期化
const map = L.map("map").setView([35.6895, 139.6917], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
}).addTo(map);

map.on("click", function (e) {
    selectedLat = e.latlng.lat;
    selectedLng = normalizeLongitude(e.latlng.lng);
    coordsEl.textContent = `緯度・経度: ${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`;
    addressEl.textContent = "住所: -";
    statusEl.innerHTML = "地図がタップされました。<br>「場所設定」ボタンを押してください。";
    fetchWeatherBtn.disabled = true;
    forecastEl.innerHTML = "";
    fetchedTimeEl.textContent = "";
    forecastEl.classList.add("hidden"); // 予報非表示に戻す
    forecastEl.classList.add("hidden");

    if (marker) map.removeLayer(marker);
    marker = L.marker([selectedLat, selectedLng], { icon: tempMarkerIcon }).addTo(map);
});

// 場所設定ボタン処理
setLocationBtn.addEventListener("click", async () => {
    const now = Date.now();
    if (now - lastSetTime < 3000) return;
    lastSetTime = now;

    if (!selectedLat || !selectedLng) {
        statusEl.innerHTML = "まず地図をタップしてください。";
        return;
    }

    statusEl.innerHTML = "住所取得中...";

    if (marker) map.removeLayer(marker);
    marker = L.marker([selectedLat, selectedLng], { icon: officialMarkerIcon }).addTo(map);

    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${selectedLat}&lon=${selectedLng}&format=json`
        );
        const data = await res.json();
        addressEl.textContent = `住所: ${data.display_name || "不明"}`;
        statusEl.innerHTML = "場所が設定されました。<br>「予報取得」ボタンを押してください。";
        fetchWeatherBtn.disabled = false;
        messageEl.textContent = ""; // 案内文消去
    } catch (err) {
        statusEl.innerHTML = "住所の取得に失敗しました。";
    }
});

// 天気コードを絵文字に変換
function weatherEmoji(code) {
    if (code === 0) return '☀️';           // 快晴
    if (code === 1) return '🌤️';          // ほぼ晴れ
    if (code === 2) return '⛅';           // 薄曇り
    if (code === 3) return '☁️';           // 曇り

    if (code === 45 || code === 48) return '🌫️'; // 霧

    if (code === 51 || code === 53 || code === 55) return '🌦️'; // 霧雨
    if (code === 56 || code === 57) return '🌧️❄️';              // 凍結霧雨

    if (code === 61 || code === 63) return '🌧️';      // 弱〜中程度の雨
    if (code === 65) return '🌧️🌧️';                  // 強い雨
    if (code === 66 || code === 67) return '🌧️❄️';    // 凍結雨

    if (code === 71 || code === 73) return '🌨️';      // 弱〜中程度の雪
    if (code === 75) return '❄️❄️';                  // 強い雪
    if (code === 77) return '🌨️⛄';                   // 雪あられ

    if (code === 80) return '🚿';           // 弱いにわか雨
    if (code === 81) return '🌧️🚿';         // 中程度のにわか雨
    if (code === 82) return '🌧️🌧️🚿';       // 激しいにわか雨

    if (code === 85) return '🌨️🚿';         // 弱いにわか雪
    if (code === 86) return '🌨️❄️❄️';       // 強いにわか雪

    if (code === 95) return '⛈️';           // 雷雨
    if (code === 96) return '⛈️🧊';         // 雷雨（弱い雹）
    if (code === 99) return '⛈️🧊🧊';       // 雷雨（強い雹）

    return '❔'; // 未定義コードのフォールバック
}

// 予報取得ボタン処理
fetchWeatherBtn.addEventListener("click", async () => {
    const now = Date.now();
    if (now - lastFetchTime < 3000) return;
    lastFetchTime = now;

    if (!selectedLat || !selectedLng) {
        statusEl.innerHTML = "まず場所を設定してください。";
        return;
    }

    statusEl.innerHTML = "予報取得中...";

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${selectedLat}&longitude=${selectedLng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo`;
        const res = await fetch(url);
        const data = await res.json();
        const daily = data.daily;

        const output = daily.time.map((date, i) => {
            const emoji = weatherEmoji(daily.weathercode[i]);
            const dateStr = getFormattedDate(date);
            const min = formatTemp(daily.temperature_2m_min[i]);
            const max = formatTemp(daily.temperature_2m_max[i]);

            return `
        <div class="forecast-day">
          <span>${dateStr}</span>
          <span>${emoji}</span>
          <span>${min}</span>
          <span>/</span>
          <span>${max}</span>
        </div>
      `;
        }).join("");

        forecastEl.innerHTML = output;
        forecastEl.classList.remove("hidden"); // 表示
        statusEl.innerHTML = "予報取得完了";
        fetchedTimeEl.textContent = `予報取得日時: ${new Date().toLocaleString("ja-JP")}`;
    } catch (err) {
        statusEl.innerHTML = "予報の取得に失敗しました。";
    }
});
