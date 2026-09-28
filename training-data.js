export const trainingProgram = {
  name: "週4回トレーニングメニュー",
  gym: "InterFit",
  startDate: "2026-09-20",
  notes: [
    "火・水・木・土の超早朝に行う週4回メニュー。目標は肩・胸・起立筋の強化。",
    "基本は10回×3セット。重量は前回の重さを引き継ぎ、変える種目は重量欄の数字を書き換える",
    "ペックフライ（外）：外向きに座る通常のチェストフライ",
    "ペックフライ（内・リア）：内向きに座るリアデルトフライ。リアデルトは火・水・木・土の毎回実施",
    "ケーブルレイズは木曜と土曜の2回",
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
      exercises: [
        { id: "tue-1", name: "バーベルスクワット", sets: 3, reps: "10", rest: "2〜3分" },
        { id: "tue-2", name: "ラットプルダウン", sets: 3, reps: "10", rest: "90秒" },
        { id: "tue-3", name: "ペックフライ（内・リア）", sets: 3, reps: "10", rest: "60秒" },
        { id: "tue-4", name: "アームカール", sets: 3, reps: "10", rest: "60秒" }
      ]
    },
    {
      id: "wed-early",
      day: "水曜",
      time: "超早朝",
      title: "胸",
      exercises: [
        { id: "wed-1", name: "ベンチプレス", sets: 3, reps: "10", rest: "2〜3分" },
        { id: "wed-2", name: "ペックフライ（外）", sets: 3, reps: "10", rest: "60〜90秒" },
        { id: "wed-3", name: "ケーブルプレスダウン", sets: 3, reps: "10", rest: "60秒" },
        { id: "wed-5", name: "リアデルト（ペックフライ 内・リア）", sets: 3, reps: "10", rest: "60秒" }
      ]
    },
    {
      id: "thu-early",
      day: "木曜",
      time: "超早朝",
      title: "肩メイン",
      exercises: [
        { id: "thu-1", name: "ミリタリープレス", sets: 3, reps: "10", rest: "2〜3分" },
        { id: "thu-2", name: "ケーブルレイズ", sets: 3, reps: "10", rest: "60秒" },
        { id: "thu-3", name: "ペックフライ（内・リア）", sets: 3, reps: "10", rest: "60秒" },
        { id: "thu-4", name: "アームカール", sets: 3, reps: "10", rest: "60秒" }
      ]
    },
    {
      id: "sat-early",
      day: "土曜",
      time: "超早朝",
      title: "胸・前肩",
      exercises: [
        { id: "sat-1", name: "ベンチプレス", sets: 3, reps: "10", rest: "2分" },
        { id: "sat-2", name: "ミリタリープレス", sets: 3, reps: "10", rest: "2分" },
        { id: "sat-3", name: "ペックフライ（外）", sets: 3, reps: "10", rest: "60秒" },
        { id: "sat-4", name: "ケーブルレイズ", sets: 3, reps: "10", rest: "60秒" },
        { id: "sat-5", name: "ケーブルプレスダウン", sets: 3, reps: "10", rest: "60秒" },
        { id: "sat-7", name: "リアデルト（ペックフライ 内・リア）", sets: 3, reps: "10", rest: "60秒" }
      ]
    }
  ]
};
