export const trainingProgram = {
  name: "肩・胸・起立筋特化プログラム",
  gym: "InterFit",
  startDate: "2026-09-20",
  schedule: [
    {
      id: "tue-early",
      day: "火曜",
      time: "超早朝",
      title: "背中と起立筋",
      warmup: { type: "トレッドミル", duration: 5, unit: "分" },
      exercises: [
        { id: "tue-1", name: "バーベルデッドリフト（起立筋メイン）", sets: 4, reps: "6-8", rest: 90 },
        { id: "tue-2", name: "ラットプルダウン", sets: 3, reps: "10-12", rest: 60 },
        { id: "tue-3", name: "シーテッドロー", sets: 3, reps: "10-12", rest: 60 },
        { id: "tue-4", name: "ケーブルロー", sets: 3, reps: "12-15", rest: 60 },
        { id: "tue-5", name: "バーベルロー", sets: 3, reps: "8-10", rest: 90 }
      ]
    },
    {
      id: "wed-early",
      day: "水曜",
      time: "超早朝",
      title: "背中＋胸補助",
      warmup: { type: "バイク", duration: 5, unit: "分" },
      exercises: [
        { id: "wed-1", name: "ラットプルダウン", sets: 4, reps: "8-10", rest: 60 },
        { id: "wed-2", name: "シーテッドロー", sets: 4, reps: "8-10", rest: 60 },
        { id: "wed-3", name: "バーベルロー", sets: 3, reps: "6-8", rest: 90 },
        { id: "wed-4", name: "ケーブルロー", sets: 3, reps: "12-15", rest: 60 },
        { id: "wed-5", name: "チェストプレスマシン", sets: 3, reps: "10-12", rest: 60 }
      ]
    },
    {
      id: "thu-early",
      day: "木曜",
      time: "超早朝",
      title: "肩メイン",
      warmup: { type: "バイク", duration: 5, unit: "分" },
      exercises: [
        { id: "thu-1", name: "バーベルショルダープレス", sets: 4, reps: "6-8", rest: 90 },
        { id: "thu-2", name: "ショルダープレスマシン", sets: 3, reps: "8-10", rest: 60 },
        { id: "thu-3", name: "ダンベルサイドレイズ", sets: 4, reps: "12-15", rest: 60 },
        { id: "thu-4", name: "ケーブルアップライトロー", sets: 3, reps: "12-15", rest: 60 },
        { id: "thu-5", name: "ケーブルリバースフライ（後ろ肩）", sets: 3, reps: "12-15", rest: 60 }
      ]
    },
    {
      id: "sat-early",
      day: "土曜",
      time: "超早朝",
      title: "胸と前肩",
      warmup: { type: "トレッドミル", duration: 5, unit: "分" },
      exercises: [
        { id: "sat-1", name: "バーベルベンチプレス", sets: 4, reps: "6-8", rest: 90 },
        { id: "sat-2", name: "チェストプレスマシン", sets: 3, reps: "8-10", rest: 60 },
        { id: "sat-3", name: "ペックデック", sets: 3, reps: "12-15", rest: 60 },
        { id: "sat-4", name: "ケーブルフライ", sets: 3, reps: "12-15", rest: 60 },
        { id: "sat-5", name: "ダンベルフロントレイズ", sets: 3, reps: "12-15", rest: 60 }
      ]
    }
  ]
};
