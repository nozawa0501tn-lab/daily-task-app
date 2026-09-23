export const trainingProgram = {
  name: "週4回トレーニングメニュー",
  gym: "InterFit",
  startDate: "2026-09-20",
  notes: [
    "火・水・木・土の超早朝に行う週4回メニュー。目標は肩・胸・起立筋の強化。",
    "ペックフライ（外）：外向きに座る通常のチェストフライ",
    "ペックフライ（内・リア）：内向きに座るリアデルトフライ",
    "ケーブルレイズは木曜と土曜の2回",
    "重い種目（ベンチ・ミリタリー・スクワット）は回数少なめ・休憩長めで重量を追う",
    "レイズやフライ系は回数多めで効かせる",
    "土曜は水・木より重量を少し落とし、疲労を溜めすぎない",
    "各日の最初の種目は、軽い重量で1〜2セット慣らしてから本番セットに入る",
    "起立筋に直接効くのはスクワットのみ。余裕があれば火曜にデッドリフトかバックエクステンションを1種目追加"
  ],
  schedule: [
    {
      id: "tue-early",
      day: "火曜",
      time: "超早朝",
      title: "脚・背中・起立筋",
      warmup: { type: "トレッドミル", duration: 5, unit: "分" },
      exercises: [
        { id: "tue-1", name: "バーベルスクワット", sets: 4, reps: "6〜8", rest: "2〜3分" },
        { id: "tue-2", name: "ラットプルダウン", sets: 4, reps: "8〜12", rest: "90秒" },
        { id: "tue-3", name: "ペックフライ（内・リア）", sets: 3, reps: "12〜15", rest: "60秒" },
        { id: "tue-4", name: "アームカール", sets: 3, reps: "10〜12", rest: "60秒" },
        { id: "tue-5", name: "トレッドミル（傾斜ウォーク）", duration: "15分" }
      ]
    },
    {
      id: "wed-early",
      day: "水曜",
      time: "超早朝",
      title: "胸",
      warmup: { type: "トレッドミル", duration: 5, unit: "分" },
      exercises: [
        { id: "wed-1", name: "ベンチプレス", sets: 4, reps: "6〜8", rest: "2〜3分" },
        { id: "wed-2", name: "ペックフライ（外）", sets: 3, reps: "10〜12", rest: "60〜90秒" },
        { id: "wed-3", name: "ケーブルプレスダウン", sets: 3, reps: "10〜12", rest: "60秒" },
        { id: "wed-4", name: "トレッドミル（傾斜ウォーク）", duration: "15分" }
      ]
    },
    {
      id: "thu-early",
      day: "木曜",
      time: "超早朝",
      title: "肩メイン",
      warmup: { type: "トレッドミル", duration: 5, unit: "分" },
      exercises: [
        { id: "thu-1", name: "ミリタリープレス", sets: 4, reps: "6〜8", rest: "2〜3分" },
        { id: "thu-2", name: "ケーブルレイズ", sets: 4, reps: "12〜15", rest: "60秒" },
        { id: "thu-3", name: "ペックフライ（内・リア）", sets: 3, reps: "12〜15", rest: "60秒" },
        { id: "thu-4", name: "アームカール", sets: 3, reps: "10〜12", rest: "60秒" },
        { id: "thu-5", name: "トレッドミル（傾斜ウォーク）", duration: "15分" }
      ]
    },
    {
      id: "sat-early",
      day: "土曜",
      time: "超早朝",
      title: "胸・前肩",
      warmup: { type: "トレッドミル", duration: 5, unit: "分" },
      exercises: [
        { id: "sat-1", name: "ベンチプレス", sets: 3, reps: "8〜10", rest: "2分" },
        { id: "sat-2", name: "ミリタリープレス", sets: 3, reps: "8〜10", rest: "2分" },
        { id: "sat-3", name: "ペックフライ（外）", sets: 3, reps: "12〜15", rest: "60秒" },
        { id: "sat-4", name: "ケーブルレイズ", sets: 3, reps: "12〜15", rest: "60秒" },
        { id: "sat-5", name: "ケーブルプレスダウン", sets: 3, reps: "12〜15", rest: "60秒" },
        { id: "sat-6", name: "トレッドミル（傾斜ウォーク）", duration: "10分" }
      ]
    }
  ]
};
