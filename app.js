const storageKey = "freediveLogs";
const today = new Date().toISOString().slice(0, 10);
const diveDateInput = document.querySelector("#diveDate");
const logForm = document.querySelector("#logForm");
const logList = document.querySelector("#logList");
const clearLogsButton = document.querySelector("#clearLogs");
const timerForm = document.querySelector("#timerForm");
const resetTimerButton = document.querySelector("#resetTimer");
const timerPhase = document.querySelector("#timerPhase");
const timerClock = document.querySelector("#timerClock");
const timerRound = document.querySelector("#timerRound");
const checklist = document.querySelector("#checklist");
const safetyStatus = document.querySelector("#safetyStatus");
const todayStatus = document.querySelector("#todayStatus");

let timerId;
let currentPlan = [];
let currentStep = 0;
let remainingSeconds = 0;

diveDateInput.value = today;
renderLogs();
updateSafetyStatus();

function formatSeconds(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function readLogs() {
  return JSON.parse(localStorage.getItem(storageKey) || "[]");
}

function saveLogs(logs) {
  localStorage.setItem(storageKey, JSON.stringify(logs));
}

function renderLogs() {
  const logs = readLogs();
  logList.innerHTML = "";

  if (logs.length === 0) {
    logList.innerHTML = '<li class="empty">아직 저장된 다이빙 기록이 없습니다.</li>';
    todayStatus.textContent = "첫 기록 대기";
    return;
  }

  todayStatus.textContent = `${logs.length}개 로그`;
  logs
    .slice()
    .reverse()
    .forEach((log) => {
      const item = document.createElement("li");
      item.innerHTML = `
        <strong>${log.site}</strong> · ${log.date}<br />
        최대 ${log.depth}m / ${formatSeconds(Number(log.duration))}<br />
        <span>${log.notes || "메모 없음"}</span>
      `;
      logList.append(item);
    });
}

function buildTimerPlan({ prep, hold, rest, rounds }) {
  const steps = [{ phase: "준비 호흡", seconds: prep, round: 0 }];

  for (let round = 1; round <= rounds; round += 1) {
    steps.push({ phase: "숨 참기", seconds: hold, round });
    steps.push({ phase: "회복 호흡", seconds: rest, round });
  }

  return steps;
}

function stopTimer(message = "훈련 설정 후 시작하세요.") {
  clearInterval(timerId);
  timerId = undefined;
  currentPlan = [];
  currentStep = 0;
  remainingSeconds = 0;
  timerPhase.textContent = "대기 중";
  timerClock.textContent = "00:00";
  timerRound.textContent = message;
}

function renderTimerStep() {
  const step = currentPlan[currentStep];

  if (!step) {
    stopTimer("훈련 완료! 충분히 회복하고 수분을 섭취하세요.");
    return;
  }

  timerPhase.textContent = step.phase;
  timerClock.textContent = formatSeconds(remainingSeconds);
  timerRound.textContent = step.round === 0 ? "몸과 마음을 천천히 준비하세요." : `${step.round}라운드 진행 중`;
}

function tickTimer() {
  remainingSeconds -= 1;

  if (remainingSeconds < 0) {
    currentStep += 1;
    remainingSeconds = currentPlan[currentStep]?.seconds ?? 0;
  }

  renderTimerStep();
}

logForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const log = {
    date: diveDateInput.value,
    site: document.querySelector("#diveSite").value.trim(),
    depth: document.querySelector("#depth").value,
    duration: document.querySelector("#duration").value,
    notes: document.querySelector("#notes").value.trim(),
  };

  if (!log.site || !log.depth || !log.duration) {
    return;
  }

  const logs = readLogs();
  logs.push(log);
  saveLogs(logs);
  logForm.reset();
  diveDateInput.value = today;
  renderLogs();
});

clearLogsButton.addEventListener("click", () => {
  saveLogs([]);
  renderLogs();
});

timerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearInterval(timerId);

  const prep = Number(document.querySelector("#prepSeconds").value);
  const hold = Number(document.querySelector("#holdSeconds").value);
  const rest = Number(document.querySelector("#restSeconds").value);
  const rounds = Number(document.querySelector("#rounds").value);

  currentPlan = buildTimerPlan({ prep, hold, rest, rounds });
  currentStep = 0;
  remainingSeconds = currentPlan[0].seconds;
  renderTimerStep();
  timerId = setInterval(tickTimer, 1000);
});

resetTimerButton.addEventListener("click", () => stopTimer());

checklist.addEventListener("change", updateSafetyStatus);

function updateSafetyStatus() {
  const checks = [...checklist.querySelectorAll('input[type="checkbox"]')];
  const completed = checks.filter((check) => check.checked).length;
  safetyStatus.textContent = `${completed}/${checks.length} 완료`;
  safetyStatus.classList.toggle("complete", completed === checks.length);
}
