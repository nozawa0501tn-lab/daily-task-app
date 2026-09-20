import { firebaseConfig } from "./firebase-config.js";
import { trainingProgram } from "./training-data.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

(function () {
  "use strict";

  const STORAGE_KEY = "dailyTaskApp_v1";
  const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];
  const DEFAULT_LABELS = [
    { name: "勉強", color: "#3b82f6" },
    { name: "筋トレ", color: "#f97316" },
    { name: "家事", color: "#10b981" }
  ];
  const COLOR_PALETTE = [
    "#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#ec4899",
    "#14b8a6", "#ef4444", "#eab308", "#6366f1", "#06b6d4"
  ];
  const RING_CIRCUMFERENCE = 326.7256;

  /** @type {{tasks: Array, records: Object, labels: Array}} */
  let state = loadState();
  let editingTaskId = null;

  function loadState() {
    let loaded = { tasks: [], records: {}, labels: [] };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tasks) && parsed.records) {
          loaded = parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
    return normalizeState(loaded);
  }

  // Ensures state.labels exists and contains every label already used by a task
  // (covers backups/state saved before label management existed).
  function normalizeState(loaded) {
    if (!loaded.training || !loaded.training.records) {
      loaded.training = { records: {} };
    }
    Object.keys(loaded.training.records).forEach((k) => {
      if (!k.includes("|")) {
        const rec = loaded.training.records[k];
        delete loaded.training.records[k];
        loaded.training.records[`${k}|${rec.sessionId}`] = rec;
      }
    });
    if (!Array.isArray(loaded.labels) || loaded.labels.length === 0) {
      loaded.labels = DEFAULT_LABELS.map((l) => ({ ...l }));
    }
    loaded.tasks.forEach((t) => {
      if (t.label && !loaded.labels.some((l) => l.name === t.label)) {
        loaded.labels.push({ name: t.label, color: nextPaletteColor(loaded.labels) });
      }
    });
    return loaded;
  }

  function nextPaletteColor(labels) {
    const used = labels.map((l) => l.color);
    const unused = COLOR_PALETTE.find((c) => !used.includes(c));
    return unused || COLOR_PALETTE[labels.length % COLOR_PALETTE.length];
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (userDocRef && !applyingRemoteUpdate) {
      setDoc(userDocRef, state).catch((e) => console.error("クラウドへの保存に失敗しました", e));
    }
  }

  // ---------- Firebase: auth + cross-device sync ----------
  const fbApp = initializeApp(firebaseConfig);
  const auth = getAuth(fbApp);
  const db = getFirestore(fbApp);
  let userDocRef = null;
  let applyingRemoteUpdate = false;
  let unsubscribeSnapshot = null;

  function authErrorMessage(err) {
    const map = {
      "auth/invalid-email": "メールアドレスの形式が正しくありません。",
      "auth/user-not-found": "ユーザーが見つかりません。",
      "auth/wrong-password": "パスワードが違います。",
      "auth/invalid-credential": "メールアドレスまたはパスワードが違います。",
      "auth/email-already-in-use": "このメールアドレスは既に登録されています。",
      "auth/weak-password": "パスワードは6文字以上にしてください。"
    };
    return map[err.code] || err.message;
  }

  document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const errorEl = document.getElementById("authError");
    errorEl.hidden = true;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      errorEl.textContent = "ログインに失敗しました: " + authErrorMessage(err);
      errorEl.hidden = false;
    }
  });

  document.getElementById("authSignUpBtn").addEventListener("click", async () => {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const errorEl = document.getElementById("authError");
    errorEl.hidden = true;
    if (!email || !password) {
      errorEl.textContent = "メールアドレスとパスワードを入力してください。";
      errorEl.hidden = false;
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      errorEl.textContent = "登録に失敗しました: " + authErrorMessage(err);
      errorEl.hidden = false;
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth));

  onAuthStateChanged(auth, (user) => {
    const authScreen = document.getElementById("authScreen");
    const appRoot = document.getElementById("appRoot");

    if (unsubscribeSnapshot) {
      unsubscribeSnapshot();
      unsubscribeSnapshot = null;
    }

    if (user) {
      authScreen.hidden = true;
      appRoot.hidden = false;
      userDocRef = doc(db, "users", user.uid, "data", "state");
      unsubscribeSnapshot = onSnapshot(
        userDocRef,
        (snap) => {
          if (snap.exists()) {
            applyingRemoteUpdate = true;
            state = normalizeState(snap.data());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            renderLabelUI();
            renderManageList();
            renderToday();
            renderHistory();
            renderTraining();
            applyingRemoteUpdate = false;
          } else {
            // 初回ログイン: ローカルの状態をクラウドの初期データとして保存する
            setDoc(userDocRef, state);
          }
        },
        (err) => console.error("クラウドとの同期に失敗しました", err)
      );
    } else {
      userDocRef = null;
      authScreen.hidden = false;
      appRoot.hidden = true;
      document.getElementById("authForm").reset();
    }
  });

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function isoToDate(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function dateToISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function addDaysISO(iso, days) {
    const d = isoToDate(iso);
    d.setDate(d.getDate() + days);
    return dateToISO(d);
  }

  function addWeeksISO(iso, weeks) {
    return addDaysISO(iso, weeks * 7);
  }

  function labelColor(labelName) {
    const found = state.labels.find((l) => l.name === labelName);
    return found ? found.color : "#8b5cf6";
  }

  function addLabel(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const existing = state.labels.find((l) => l.name === trimmed);
    if (existing) return existing;
    const label = { name: trimmed, color: nextPaletteColor(state.labels) };
    state.labels.push(label);
    saveState();
    return label;
  }

  function deleteLabel(name) {
    if (state.tasks.some((t) => t.label === name)) {
      alert("このラベルは使用中のタスクがあるため削除できません。先にタスクのラベルを変更するか、タスクを削除してください。");
      return;
    }
    if (!confirm(`ラベル「${name}」を削除しますか?`)) return;
    state.labels = state.labels.filter((l) => l.name !== name);
    saveState();
    renderLabelUI();
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function getRecord(iso) {
    if (!state.records[iso]) {
      state.records[iso] = { completed: [], total: 0, grade: null };
    }
    return state.records[iso];
  }

  // ラベルの登録順で並べ替える(同じラベル内は登録順のまま)。未登録ラベルは末尾。
  function sortByLabel(tasks) {
    const rank = (t) => {
      const i = state.labels.findIndex((l) => l.name === t.label);
      return i < 0 ? state.labels.length : i;
    };
    return tasks
      .map((t, i) => ({ t, i, r: rank(t) }))
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map((x) => x.t);
  }

  function tasksForDate(iso) {
    const dow = isoToDate(iso).getDay();
    return sortByLabel(state.tasks).filter((t) => {
      if (t.type === "weekday") return t.days.includes(dow);
      // 単体タスク: 期日以降は完了するまで毎日持ち越される。完了した当日だけは
      // チェック済みの状態で表示するため doneDate === iso も対象に含める。
      if (t.type === "date") return (!t.done && t.date <= iso) || t.doneDate === iso;
      // 数週間ごとの繰り返しタスク: 次回期日が来たら表示し、完了すると期日を
      // 間隔ぶん先に進める。完了した当日だけはチェック済みで表示する。
      if (t.type === "interval") return t.dueDate <= iso || t.lastCompletedDate === iso;
      return false;
    });
  }

  function somedayTasks() {
    return sortByLabel(state.tasks).filter((t) => t.type === "someday" && !t.done);
  }

  // ---------- Tabs ----------
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "manage") {
        renderLabelUI();
        renderManageList();
      }
      if (btn.dataset.tab === "history") renderHistory();
      if (btn.dataset.tab === "training") renderTraining();
    });
  });

  // ---------- Today tab ----------
  function renderToday() {
    const iso = todayISO();
    const dateObj = isoToDate(iso);
    document.getElementById("todayDateLabel").textContent =
      `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日 (${WEEKDAY_NAMES[dateObj.getDay()]})`;

    const dayTasks = tasksForDate(iso);
    const record = getRecord(iso);
    record.total = dayTasks.length;
    record.completed = record.completed.filter((id) => dayTasks.some((t) => t.id === id));

    // Today task list
    const list = document.getElementById("todayTaskList");
    list.innerHTML = "";
    // 完了済みは表から隠し、下の折りたたみ(取り消し用)に移す
    const pendingTasks = dayTasks.filter((t) => !record.completed.includes(t.id));
    const doneTasks = dayTasks.filter((t) => record.completed.includes(t.id));
    pendingTasks.forEach((t) => list.appendChild(renderTaskRow(t, false, () => toggleTodayTask(t.id))));
    const emptyMsg = document.getElementById("todayEmptyMsg");
    emptyMsg.textContent = dayTasks.length === 0
      ? "今日のタスクはありません。「タスク管理」から追加してください。"
      : "今日のタスクはすべて完了しました。";
    emptyMsg.hidden = pendingTasks.length > 0;
    const doneBox = document.getElementById("todayDoneBox");
    const doneList = document.getElementById("todayDoneList");
    doneList.innerHTML = "";
    doneTasks.forEach((t) => doneList.appendChild(renderTaskRow(t, true, () => toggleTodayTask(t.id))));
    document.getElementById("todayDoneSummary").textContent = `完了済み (${doneTasks.length})`;
    doneBox.hidden = doneTasks.length === 0;

    // Someday task list
    const sList = document.getElementById("somedayTaskList");
    sList.innerHTML = "";
    const sTasks = somedayTasks();
    sTasks.forEach((t) => sList.appendChild(renderTaskRow(t, false, () => completeSomedayTask(t.id))));
    document.getElementById("somedayEmptyMsg").hidden = sTasks.length > 0;

    // Progress
    const pct = record.total === 0 ? 0 : Math.round((record.completed.length / record.total) * 100);
    document.getElementById("progressPercentText").textContent = pct + "%";
    document.getElementById("progressCountText").textContent = `${record.completed.length} / ${record.total} 完了`;
    const fg = document.getElementById("progressRingFg");
    fg.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - pct / 100));

    // Grade buttons
    document.querySelectorAll(".grade-btn").forEach((b) => {
      b.classList.toggle("selected", b.dataset.grade === record.grade);
    });

    saveState();
  }

  function renderTaskRow(task, checked, onToggle) {
    const li = document.createElement("li");
    li.className = "task-item" + (checked ? " done" : "");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "task-checkbox";
    cb.checked = checked;
    cb.addEventListener("change", onToggle);
    li.appendChild(cb);

    const name = document.createElement("span");
    name.className = "task-name";
    name.textContent = task.name;
    li.appendChild(name);

    const chip = document.createElement("span");
    chip.className = "task-label-chip";
    chip.style.background = labelColor(task.label);
    chip.textContent = task.label;
    li.appendChild(chip);

    return li;
  }

  function toggleTodayTask(taskId) {
    const iso = todayISO();
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const record = getRecord(iso);
    const idx = record.completed.indexOf(taskId);
    const completing = idx < 0;

    if (task.type === "date") {
      task.done = completing;
      task.doneDate = completing ? iso : null;
    } else if (task.type === "interval") {
      if (completing) {
        task.previousDueDate = task.dueDate;
        task.lastCompletedDate = iso;
        task.dueDate = addDaysISO(iso, task.intervalWeeks * (task.intervalUnit === "days" ? 1 : 7));
      } else {
        task.dueDate = task.previousDueDate || task.dueDate;
        task.lastCompletedDate = null;
        task.previousDueDate = null;
      }
    }

    if (completing) record.completed.push(taskId);
    else record.completed.splice(idx, 1);
    renderToday();
  }

  function completeSomedayTask(taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.done = true;
    task.doneDate = todayISO();
    saveState();
    renderToday();
  }

  document.getElementById("gradeButtons").addEventListener("click", (e) => {
    const btn = e.target.closest(".grade-btn");
    if (!btn) return;
    const iso = todayISO();
    const record = getRecord(iso);
    record.grade = record.grade === btn.dataset.grade ? null : btn.dataset.grade;
    renderToday();
  });

  // ---------- Manage tab: labels ----------
  const labelForm = document.getElementById("labelForm");
  const taskLabelSelect = document.getElementById("taskLabel");

  labelForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("newLabelName");
    const label = addLabel(input.value);
    if (label) {
      input.value = "";
      renderLabelUI();
      taskLabelSelect.value = label.name;
    }
  });

  function moveLabel(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= state.labels.length) return;
    [state.labels[idx], state.labels[j]] = [state.labels[j], state.labels[idx]];
    saveState();
    renderLabelUI();
    renderManageList();
    renderToday();
  }

  function renderLabelUI() {
    const chipList = document.getElementById("labelChipList");
    chipList.innerHTML = "";
    state.labels.forEach((l, idx) => {
      const li = document.createElement("li");
      li.className = "label-chip";
      li.style.background = l.color;
      const span = document.createElement("span");
      span.textContent = l.name;
      li.appendChild(span);
      [["‹", -1, "優先度を上げる(左へ)"], ["›", 1, "優先度を下げる(右へ)"]].forEach(([text, dir, title]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = text;
        b.title = title;
        b.disabled = idx + dir < 0 || idx + dir >= state.labels.length;
        b.addEventListener("click", () => moveLabel(idx, dir));
        li.appendChild(b);
      });
      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.textContent = "×";
      delBtn.title = `「${l.name}」を削除`;
      delBtn.addEventListener("click", () => deleteLabel(l.name));
      li.appendChild(delBtn);
      chipList.appendChild(li);
    });

    const previousValue = taskLabelSelect.value;
    taskLabelSelect.innerHTML = "";
    state.labels.forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l.name;
      opt.textContent = l.name;
      taskLabelSelect.appendChild(opt);
    });
    if (state.labels.some((l) => l.name === previousValue)) {
      taskLabelSelect.value = previousValue;
    }
  }

  // ---------- Manage tab: tasks ----------
  const taskForm = document.getElementById("taskForm");
  const weekdayPicker = document.getElementById("weekdayPicker");
  const datePicker = document.getElementById("datePicker");
  const intervalPicker = document.getElementById("intervalPicker");

  taskForm.querySelectorAll('input[name="taskType"]').forEach((radio) => {
    radio.addEventListener("change", updateFormVisibility);
  });

  function updateFormVisibility() {
    const type = taskForm.querySelector('input[name="taskType"]:checked').value;
    weekdayPicker.hidden = type !== "weekday";
    datePicker.hidden = type !== "date";
    intervalPicker.hidden = type !== "interval";
    const dueDateInput = document.getElementById("taskIntervalDueDate");
    if (type === "interval" && !dueDateInput.value) {
      dueDateInput.value = todayISO();
    }
  }

  taskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("taskName").value.trim();
    const label = document.getElementById("taskLabel").value.trim();
    const type = taskForm.querySelector('input[name="taskType"]:checked').value;
    if (!name || !label) return;

    let days = [];
    let date = "";
    let intervalWeeks = null; // 間隔の数値(単位は intervalUnit。保存データ互換のため名前は据え置き)
    let intervalUnit = "weeks";
    let dueDate = "";
    if (type === "weekday") {
      days = Array.from(weekdayPicker.querySelectorAll('input[type="checkbox"]:checked')).map((c) => Number(c.value));
      if (days.length === 0) {
        alert("曜日を1つ以上選択してください。");
        return;
      }
    } else if (type === "date") {
      date = document.getElementById("taskDate").value;
      if (!date) {
        alert("日付を選択してください。");
        return;
      }
    } else if (type === "interval") {
      intervalWeeks = Number(document.getElementById("taskIntervalWeeks").value);
      dueDate = document.getElementById("taskIntervalDueDate").value;
      intervalUnit = document.getElementById("taskIntervalUnit").value;
      if (!intervalWeeks || intervalWeeks < 1) {
        alert("間隔は1以上で指定してください。");
        return;
      }
      if (!dueDate) {
        alert("次回の期日を選択してください。");
        return;
      }
    }

    if (editingTaskId) {
      const task = state.tasks.find((t) => t.id === editingTaskId);
      Object.assign(task, { name, label, type, days, date });
      if (type === "interval") Object.assign(task, { intervalWeeks, intervalUnit, dueDate });
      editingTaskId = null;
    } else {
      state.tasks.push({
        id: uid(),
        name,
        label,
        type,
        days,
        date,
        intervalWeeks,
        intervalUnit,
        dueDate,
        lastCompletedDate: null,
        previousDueDate: null,
        done: false,
        doneDate: null,
        createdAt: todayISO()
      });
    }

    resetForm();
    saveState();
    renderManageList();
    renderToday();
  });

  document.getElementById("cancelEditBtn").addEventListener("click", resetForm);

  function resetForm() {
    taskForm.reset();
    editingTaskId = null;
    document.getElementById("formTitle").textContent = "タスクを追加";
    document.getElementById("submitBtn").textContent = "追加";
    document.getElementById("cancelEditBtn").hidden = true;
    updateFormVisibility();
  }

  function startEditTask(taskId) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    editingTaskId = taskId;
    document.getElementById("taskName").value = task.name;
    document.getElementById("taskLabel").value = task.label;
    taskForm.querySelector(`input[name="taskType"][value="${task.type}"]`).checked = true;
    updateFormVisibility();
    weekdayPicker.querySelectorAll('input[type="checkbox"]').forEach((c) => {
      c.checked = task.days.includes(Number(c.value));
    });
    document.getElementById("taskDate").value = task.date || "";
    document.getElementById("taskIntervalWeeks").value = task.intervalWeeks || 2;
    document.getElementById("taskIntervalUnit").value = task.intervalUnit || "weeks";
    document.getElementById("taskIntervalDueDate").value = task.dueDate || "";
    document.getElementById("formTitle").textContent = "タスクを編集";
    document.getElementById("submitBtn").textContent = "更新";
    document.getElementById("cancelEditBtn").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteTask(taskId) {
    if (!confirm("このタスクを削除しますか?")) return;
    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    if (editingTaskId === taskId) resetForm();
    saveState();
    renderManageList();
    renderToday();
  }

  function renderManageList() {
    const list = document.getElementById("manageTaskList");
    list.innerHTML = "";
    sortByLabel(state.tasks).forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item" + (task.done ? " done" : "");

      const name = document.createElement("span");
      name.className = "task-name";
      name.textContent = task.name;
      li.appendChild(name);

      const chip = document.createElement("span");
      chip.className = "task-label-chip";
      chip.style.background = labelColor(task.label);
      chip.textContent = task.label;
      li.appendChild(chip);

      const meta = document.createElement("span");
      meta.className = "task-meta";
      if (task.type === "weekday") {
        meta.textContent = task.days.map((d) => WEEKDAY_NAMES[d]).join("・");
      } else if (task.type === "date") {
        meta.textContent = task.done
          ? `完了 (${task.doneDate})`
          : task.date < todayISO()
          ? `${task.date} (未完了・持ち越し中)`
          : task.date;
      } else if (task.type === "interval") {
        meta.textContent = `${task.intervalWeeks}${task.intervalUnit === "days" ? "日" : "週間"}ごと・次回 ${task.dueDate}`;
      } else {
        meta.textContent = task.done ? `完了 (${task.doneDate})` : "いつかやる";
      }
      li.appendChild(meta);

      const actions = document.createElement("span");
      actions.className = "task-actions";

      if ((task.type === "someday" || task.type === "date") && task.done) {
        const undoBtn = document.createElement("button");
        undoBtn.textContent = "未完了に戻す";
        undoBtn.addEventListener("click", () => {
          task.done = false;
          task.doneDate = null;
          saveState();
          renderManageList();
          renderToday();
        });
        actions.appendChild(undoBtn);
      }

      const editBtn = document.createElement("button");
      editBtn.textContent = "編集";
      editBtn.addEventListener("click", () => startEditTask(task.id));
      actions.appendChild(editBtn);

      const delBtn = document.createElement("button");
      delBtn.textContent = "削除";
      delBtn.className = "delete-btn";
      delBtn.addEventListener("click", () => deleteTask(task.id));
      actions.appendChild(delBtn);

      li.appendChild(actions);
      list.appendChild(li);
    });
    document.getElementById("manageEmptyMsg").hidden = state.tasks.length > 0;
  }

  // ---------- History tab ----------
  function renderHistory() {
    const tbody = document.getElementById("historyTableBody");
    tbody.innerHTML = "";
    const dates = Object.keys(state.records).sort((a, b) => (a < b ? 1 : -1));
    dates.forEach((iso) => {
      const record = state.records[iso];
      if (record.total === 0 && !record.grade) return;
      const tr = document.createElement("tr");

      const dateTd = document.createElement("td");
      dateTd.textContent = iso;
      tr.appendChild(dateTd);

      const dowTd = document.createElement("td");
      dowTd.textContent = WEEKDAY_NAMES[isoToDate(iso).getDay()];
      tr.appendChild(dowTd);

      const pctTd = document.createElement("td");
      const pct = record.total === 0 ? 0 : Math.round((record.completed.length / record.total) * 100);
      pctTd.textContent = `${pct}% (${record.completed.length}/${record.total})`;
      tr.appendChild(pctTd);

      const gradeTd = document.createElement("td");
      if (record.grade) {
        const pill = document.createElement("span");
        pill.className = "grade-pill";
        pill.textContent = record.grade;
        gradeTd.appendChild(pill);
      } else {
        gradeTd.textContent = "-";
      }
      tr.appendChild(gradeTd);

      tbody.appendChild(tr);
    });
    document.getElementById("historyEmptyMsg").hidden = tbody.children.length > 0;
  }

  // ---------- Training tab ----------
  const DAY_TO_DOW = { "日曜": 0, "月曜": 1, "火曜": 2, "水曜": 3, "木曜": 4, "金曜": 5, "土曜": 6 };

  function trainingItems(session) {
    const w = session.warmup;
    const items = [{ id: `${session.id}-warmup`, name: `ウォームアップ: ${w.type}`, sub: `${w.duration}${w.unit}` }];
    session.exercises.forEach((ex) => {
      items.push({ id: ex.id, name: ex.name, sub: `${ex.sets}セット × ${ex.reps}回 ／ 休憩 ${ex.rest}秒` });
    });
    return items;
  }

  function sessionForDate(iso) {
    if (iso < trainingProgram.startDate) return null;
    const dow = isoToDate(iso).getDay();
    return trainingProgram.schedule.find((s) => DAY_TO_DOW[s.day] === dow) || null;
  }

  const openTrainingSessions = new Set();

  function trainingKey(iso, session) {
    return `${iso}|${session.id}`;
  }

  function trainingCompleted(iso, session) {
    const rec = state.training.records[trainingKey(iso, session)];
    const items = trainingItems(session);
    return rec ? rec.completed.filter((id) => items.some((i) => i.id === id)) : [];
  }

  function toggleTrainingItem(session, itemId) {
    const records = state.training.records;
    const key = trainingKey(todayISO(), session);
    if (!records[key]) {
      records[key] = { sessionId: session.id, completed: [], total: trainingItems(session).length };
    }
    const rec = records[key];
    const idx = rec.completed.indexOf(itemId);
    if (idx >= 0) rec.completed.splice(idx, 1);
    else rec.completed.push(itemId);
    saveState();
    renderTraining();
  }

  function renderTraining() {
    const iso = todayISO();
    document.getElementById("trainingProgramName").textContent = trainingProgram.name;
    document.getElementById("trainingProgramInfo").textContent =
      `${trainingProgram.gym} ・ 開始日 ${trainingProgram.startDate}`;

    const session = sessionForDate(iso);
    const list = document.getElementById("trainingTodayList");
    const progress = document.getElementById("trainingProgress");
    const restMsg = document.getElementById("trainingRestMsg");
    list.innerHTML = "";

    if (session) {
      const items = trainingItems(session);
      const completed = trainingCompleted(iso, session);
      document.getElementById("trainingTodayTitle").textContent =
        `今日のメニュー: ${session.day} ${session.time} ${session.title}`;
      items.forEach((item) => {
        const checked = completed.includes(item.id);
        const li = document.createElement("li");
        li.className = "task-item" + (checked ? " done" : "");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "task-checkbox";
        cb.checked = checked;
        cb.addEventListener("change", () => toggleTrainingItem(session, item.id));
        li.appendChild(cb);
        const text = document.createElement("div");
        text.className = "task-text";
        const name = document.createElement("span");
        name.className = "task-name";
        name.textContent = item.name;
        const sub = document.createElement("span");
        sub.className = "task-sub";
        sub.textContent = item.sub;
        text.appendChild(name);
        text.appendChild(sub);
        li.appendChild(text);
        list.appendChild(li);
      });
      const pct = Math.round((completed.length / items.length) * 100);
      document.getElementById("trainingProgressFill").style.width = pct + "%";
      document.getElementById("trainingProgressText").textContent = `${completed.length} / ${items.length} 完了 (${pct}%)`;
      progress.hidden = false;
      restMsg.hidden = true;
    } else {
      document.getElementById("trainingTodayTitle").textContent = "今日のメニュー";
      progress.hidden = true;
      let next = null;
      for (let i = 1; i <= 14 && !next; i++) {
        const d = addDaysISO(iso, i);
        const s = sessionForDate(d);
        if (s) next = { date: d, session: s };
      }
      const before = iso < trainingProgram.startDate ? "(開始前) " : "";
      restMsg.textContent = next
        ? `${before}今日は筋トレの予定がありません。次回: ${next.date} ${next.session.day} ${next.session.title}`
        : `${before}今日は筋トレの予定がありません。`;
      restMsg.hidden = false;
    }

    const week = document.getElementById("trainingWeek");
    week.innerHTML = "";
    trainingProgram.schedule.forEach((s) => {
      const sItems = trainingItems(s);
      const sDone = trainingCompleted(iso, s);
      const d = document.createElement("details");
      d.className = "week-session" + (session && session.id === s.id ? " today" : "");
      d.open = openTrainingSessions.has(s.id);
      d.addEventListener("toggle", () => {
        if (d.open) openTrainingSessions.add(s.id);
        else openTrainingSessions.delete(s.id);
      });
      const sum = document.createElement("summary");
      sum.textContent =
        `${s.day} ${s.time} ─ ${s.title}` +
        (session && session.id === s.id ? " (今日)" : "") +
        `　${sDone.length}/${sItems.length}` +
        (sDone.length === sItems.length ? " ✓完了" : "");
      d.appendChild(sum);
      const ul = document.createElement("ul");
      sItems.forEach((item) => {
        const checked = sDone.includes(item.id);
        const li = document.createElement("li");
        li.className = "week-item" + (checked ? " done" : "");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "task-checkbox";
        cb.checked = checked;
        cb.addEventListener("change", () => toggleTrainingItem(s, item.id));
        li.appendChild(cb);
        const text = document.createElement("div");
        text.className = "task-text";
        const n = document.createElement("span");
        n.className = "task-name";
        n.textContent = item.name;
        const sb = document.createElement("span");
        sb.className = "task-sub";
        sb.textContent = item.sub;
        text.appendChild(n);
        text.appendChild(sb);
        li.appendChild(text);
        ul.appendChild(li);
      });
      d.appendChild(ul);
      week.appendChild(d);
    });

    const tbody = document.getElementById("trainingHistoryBody");
    tbody.innerHTML = "";
    Object.keys(state.training.records)
      .sort((a, b) => (a < b ? 1 : -1))
      .forEach((key) => {
        const date = key.split("|")[0];
        const rec = state.training.records[key];
        const s = trainingProgram.schedule.find((x) => x.id === rec.sessionId);
        const tr = document.createElement("tr");
        const pct = rec.total === 0 ? 0 : Math.round((rec.completed.length / rec.total) * 100);
        [date, s ? `${s.day} ${s.title}` : "-", `${pct}% (${rec.completed.length}/${rec.total})`].forEach((t) => {
          const td = document.createElement("td");
          td.textContent = t;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    document.getElementById("trainingHistoryEmpty").hidden = tbody.children.length > 0;
  }

  // ---------- Backup ----------
  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-task-app-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById("importInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.tasks) || !parsed.records) {
          throw new Error("invalid format");
        }
        if (!confirm("現在のデータを上書きしてインポートしますか?")) return;
        state = normalizeState(parsed);
        saveState();
        renderLabelUI();
        renderManageList();
        renderToday();
        renderHistory();
        renderTraining();
      } catch (err) {
        alert("インポートに失敗しました。ファイルの形式を確認してください。");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  // ---------- Init ----------
  updateFormVisibility();
  renderLabelUI();
  renderToday();
  renderTraining();
})();
