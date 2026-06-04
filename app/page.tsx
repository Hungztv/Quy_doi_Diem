"use client";

import { FormEvent, useState, useEffect } from "react";

/* ────────────────────── Types ────────────────────── */

type ExamType = "HSA" | "VSAT";

type ScoreRange = {
  a: number;
  b: number;
  c: number;
  d: number;
};

type ExamConfig = {
  label: string;
  min: number;
  max: number;
  ranges: ScoreRange[];
};

type Message = {
  type: "success" | "error";
  text: string;
};

type SaveScoreResponse = {
  status: "success" | "error";
  message?: string;
};

/* ────────────────────── Constants ─────────────────── */

const EXAM_CONFIGS: Record<ExamType, ExamConfig> = {
  HSA: {
    label: "HSA (ĐHQG Hà Nội)",
    min: 85,
    max: 150,
    ranges: [
      { a: 85, b: 92, c: 24.0, d: 25.5 },
      { a: 92, b: 100, c: 25.5, d: 27.0 },
      { a: 100, b: 107, c: 27.0, d: 28.5 },
      { a: 107, b: 150, c: 28.5, d: 30.0 },
    ],
  },
  VSAT: {
    label: "V-SAT",
    min: 300,
    max: 450,
    ranges: [
      { a: 300, b: 330, c: 24.0, d: 25.5 },
      { a: 330, b: 350, c: 25.5, d: 27.0 },
      { a: 350, b: 390, c: 27.0, d: 28.5 },
      { a: 390, b: 450, c: 28.5, d: 30.0 },
    ],
  },
};

/* ────────────────────── Helpers ───────────────────── */

function isNumericInput(value: string) {
  return /^-?\d+(\.\d+)?$/.test(value.trim());
}

function convertScore(examType: ExamType, score: number) {
  const config = EXAM_CONFIGS[examType];

  const matchedRange = config.ranges.find(
    (range) => score >= range.a && score <= range.b
  );

  if (!matchedRange) {
    return null;
  }

  const { a, b, c, d } = matchedRange;

  const convertedScore = c + ((score - a) / (b - a)) * (d - c);

  return Math.round(convertedScore * 100) / 100;
}

function normalizeFacebookLink(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { value: "", error: "" };
  }

  const normalizedValue = /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    const url = new URL(normalizedValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        value: "",
        error: "Link Facebook phải bắt đầu bằng http hoặc https.",
      };
    }

    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    const isFacebookDomain =
      hostname === "facebook.com" ||
      hostname.endsWith(".facebook.com") ||
      hostname === "fb.com" ||
      hostname.endsWith(".fb.com");

    if (!isFacebookDomain) {
      return {
        value: "",
        error: "Vui lòng nhập đúng link Facebook cá nhân.",
      };
    }

    return { value: normalizedValue, error: "" };
  } catch {
    return {
      value: "",
      error: "Link Facebook không hợp lệ.",
    };
  }
}

/* ────────────────────── Component ─────────────────── */

export default function HomePage() {
  const [fullName, setFullName] = useState("");
  const [hocBaM1, setHocBaM1] = useState("");
  const [hocBaM2, setHocBaM2] = useState("");
  const [hocBaM3, setHocBaM3] = useState("");
  const [examType, setExamType] = useState<ExamType>("HSA");
  const [examScore, setExamScore] = useState("");
  const [bonusPoints, setBonusPoints] = useState("");
  const [priorityPoints, setPriorityPoints] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const selectedExam = EXAM_CONFIGS[examType];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setMessage({ type: "error", text: "Vui lòng nhập họ tên." });
      return;
    }

    if (!isNumericInput(hocBaM1) || !isNumericInput(hocBaM2) || !isNumericInput(hocBaM3)) {
      setMessage({ type: "error", text: "Vui lòng nhập đầy đủ và hợp lệ điểm 3 môn học bạ." });
      return;
    }
    const hbM1 = Number(hocBaM1);
    const hbM2 = Number(hocBaM2);
    const hbM3 = Number(hocBaM3);
    if (hbM1 < 0 || hbM1 > 10 || hbM2 < 0 || hbM2 > 10 || hbM3 < 0 || hbM3 > 10) {
      setMessage({ type: "error", text: "Điểm môn học bạ phải nằm trong khoảng từ 0 đến 10." });
      return;
    }

    const trimmedExamScore = examScore.trim();
    if (!trimmedExamScore) {
      setMessage({ type: "error", text: "Vui lòng nhập điểm thực tế bài thi ĐGNL." });
      return;
    }
    if (!isNumericInput(trimmedExamScore)) {
      setMessage({ type: "error", text: "Điểm ĐGNL không hợp lệ. Vui lòng chỉ nhập số." });
      return;
    }
    const numExamScore = Number(trimmedExamScore);
    if (numExamScore < selectedExam.min || numExamScore > selectedExam.max) {
      setMessage({ type: "error", text: `Điểm ${selectedExam.label} phải nằm trong khoảng ${selectedExam.min} – ${selectedExam.max}.` });
      return;
    }

    const convertedExamScore = convertScore(examType, numExamScore);
    if (convertedExamScore === null) {
      setMessage({ type: "error", text: "Không tìm thấy khoảng quy đổi phù hợp cho điểm ĐGNL đã nhập." });
      return;
    }

    const strBonus = bonusPoints.trim();
    const strPriority = priorityPoints.trim();
    if ((strBonus && !isNumericInput(strBonus)) || (strPriority && !isNumericInput(strPriority))) {
      setMessage({ type: "error", text: "Điểm cộng hoặc điểm ưu tiên không hợp lệ." });
      return;
    }
    const numBonus = strBonus ? Number(strBonus) : 0;
    const numPriority = strPriority ? Number(strPriority) : 0;

    const facebookValidation = normalizeFacebookLink(facebookLink);
    if (facebookValidation.error) {
      setMessage({ type: "error", text: facebookValidation.error });
      return;
    }

    const hocBaScore = ((hbM1 * 2) + hbM2 + hbM3) * 3 / 4;
    const finalScore = (hocBaScore * 0.5) + (convertedExamScore * 0.5) + numBonus + numPriority;
    const finalScoreRounded = Number(finalScore.toFixed(2));

    setIsLoading(true);

    try {
      const response = await fetch("/api/save-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          hocBaM1: hbM1,
          hocBaM2: hbM2,
          hocBaM3: hbM3,
          examType,
          examScore: numExamScore,
          bonusPoints: numBonus,
          priorityPoints: numPriority,
          finalScore: finalScoreRounded,
          facebookLink: facebookValidation.value,
        }),
      });

      const data = (await response.json().catch(() => null)) as SaveScoreResponse | null;

      if (!response.ok || data?.status !== "success") {
        setMessage({
          type: "success",
          text: `🎯 Điểm xét tuyển của bạn là ${finalScoreRounded.toFixed(2)}/30. Đã tính điểm xong, nhưng tiếc là hệ thống chưa lưu được thông tin của bạn. Bạn hãy thử lại sau nhé!`,
        });
        return;
      }

      setMessage({
        type: "success",
        text: `🎉 Tuyệt vời! Điểm xét tuyển của bạn là ${finalScoreRounded.toFixed(2)}/30. Tụi mình đã lưu thông tin thành công rồi nhé. Chuẩn bị tinh thần đón tin vui thôi nào! ✨`,
      });
    } catch (error) {
      console.error("Submit error:", error);

      setMessage({
        type: "success",
        text: `🎯 Điểm xét tuyển của bạn là ${finalScoreRounded.toFixed(2)}/30. Đã tính điểm xong, nhưng do lỗi mạng nên chưa lưu được thông tin, bạn thông cảm nhé!`,
      });
    } finally {
      setIsLoading(false);
      setCooldown(30);
    }
  }

  return (
    <main className="bg-clean relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Subtle decorative blobs */}
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />

      <section className="card fade-in-up relative z-10 w-full max-w-2xl rounded-3xl p-6 shadow-xl shadow-gray-200/60 sm:p-8">
        {/* ── Header ──────────────────────────────────── */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Quy Đổi Điểm Tuyển Sinh
          </h1>

          <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-600">
            <p>
              Mọi sự nỗ lực không ngừng nghỉ của bạn trên trang sách đều xứng đáng nhận được một kết quả tự hào. Tuy nhiên, điểm số mới chỉ là bước khởi đầu, <strong>chọn đúng ngành và chiến thuật đặt nguyện vọng</strong> mới là chìa khóa quan trọng.
            </p>
            <p>
              Hãy xem ngay điểm quy đổi của bạn tại đây và cho phép tụi mình – những anh chị đi trước, được đồng hành cùng bạn vẽ nên lộ trình tương lai thật vững chắc nhé!
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-50 to-cyan-50 px-4 py-1.5 ring-1 ring-teal-200">
              <span className="h-2 w-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 animate-pulse" />
              <span className="text-xs font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Chị Thái Bảo — Đại sứ Cham Toeic
              </span>
            </div>

            <button
              onClick={() => setShowTables(!showTables)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:text-teal-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform duration-200 ${showTables ? 'rotate-180' : ''}`}>
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
              {showTables ? "Ẩn bảng quy đổi" : "Xem bảng quy đổi"}
            </button>
          </div>
        </div>

        {/* ── Score Conversion Tables ─────────────────── */}
        {showTables && (
          <div className="mb-8 fade-in-up">
            {/* Table tab toggle */}
            <div className="flex rounded-xl bg-gray-100 p-1 mb-4">
              <button
                type="button"
                onClick={() => setExamType("HSA")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${examType === "HSA"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Bảng HSA
              </button>
              <button
                type="button"
                onClick={() => setExamType("VSAT")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${examType === "VSAT"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Bảng V-SAT
              </button>
            </div>

            {/* HSA Table */}
            {examType === "HSA" && (
              <div className="fade-in-up overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-b from-white to-teal-50/30">
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-2.5">
                  <h3 className="text-sm font-bold text-white text-center">
                    Điểm HSA quy đổi sang thang 30
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-teal-100 bg-teal-50/50">
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600 w-12">STT</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Điểm bài thi HSA</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Điểm quy đổi thang 30</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EXAM_CONFIGS.HSA.ranges.map((range, index) => (
                      <tr
                        key={index}
                        className={`border-b border-teal-50 transition-colors hover:bg-teal-50/60 ${index % 2 === 0 ? "bg-white" : "bg-teal-50/20"
                          }`}
                      >
                        <td className="px-4 py-2.5 text-center font-medium text-gray-500">{index + 1}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-gray-800">
                          {range.a} – {range.b}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-block rounded-full bg-gradient-to-r from-teal-100 to-cyan-100 px-3 py-0.5 text-sm font-bold text-teal-700">
                            {range.c.toFixed(1)} – {range.d.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* V-SAT Table */}
            {examType === "VSAT" && (
              <div className="fade-in-up overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-b from-white to-cyan-50/30">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5">
                  <h3 className="text-sm font-bold text-white text-center">
                    Điểm V-SAT quy đổi sang thang 30
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-cyan-100 bg-cyan-50/50">
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600 w-12">STT</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Điểm bài thi V-SAT</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-600">Điểm quy đổi thang 30</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EXAM_CONFIGS.VSAT.ranges.map((range, index) => (
                      <tr
                        key={index}
                        className={`border-b border-cyan-50 transition-colors hover:bg-cyan-50/60 ${index % 2 === 0 ? "bg-white" : "bg-cyan-50/20"
                          }`}
                      >
                        <td className="px-4 py-2.5 text-center font-medium text-gray-500">{index + 1}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-gray-800">
                          {range.a} – {range.b}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-block rounded-full bg-gradient-to-r from-cyan-100 to-blue-100 px-3 py-0.5 text-sm font-bold text-cyan-700">
                            {range.c.toFixed(1)} – {range.d.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Form ────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Thông tin cá nhân */}
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-gray-700">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input id="fullName" type="text" value={fullName} onChange={(event) => { setFullName(event.target.value); setMessage(null); }} placeholder="Nguyễn Văn A" className="input-glow w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400" />
          </div>

          {/* Nhóm 1: Điểm Học Bạ */}
          <div className="rounded-2xl bg-gray-50/80 p-5 ring-1 ring-gray-200">
            <h3 className="mb-4 text-sm font-bold text-gray-800">1. Điểm Học Bạ (Thang 10)</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Môn chính (nhân 2) <span className="text-red-500">*</span></label>
                <input type="number" step="0.1" min="0" max="10" value={hocBaM1} onChange={(e) => { setHocBaM1(e.target.value); setMessage(null); }} placeholder="VD: 8.5" className="input-glow w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none placeholder:text-gray-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Môn 2 <span className="text-red-500">*</span></label>
                <input type="number" step="0.1" min="0" max="10" value={hocBaM2} onChange={(e) => { setHocBaM2(e.target.value); setMessage(null); }} placeholder="VD: 9.0" className="input-glow w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none placeholder:text-gray-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Môn 3 <span className="text-red-500">*</span></label>
                <input type="number" step="0.1" min="0" max="10" value={hocBaM3} onChange={(e) => { setHocBaM3(e.target.value); setMessage(null); }} placeholder="VD: 8.0" className="input-glow w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none placeholder:text-gray-400" />
              </div>
            </div>
          </div>

          {/* Nhóm 2: Điểm ĐGNL */}
          <div className="rounded-2xl bg-gray-50/80 p-5 ring-1 ring-gray-200">
            <h3 className="mb-4 text-sm font-bold text-gray-800">2. Điểm Đánh Giá Năng Lực</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700">Chọn kỳ thi</label>
                <div className="flex rounded-xl bg-gray-200/50 p-1.5 ring-1 ring-gray-200">
                  <button type="button" onClick={() => { setExamType("HSA"); setMessage(null); }} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${examType === "HSA" ? "bg-white text-teal-700 shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>HSA – ĐHQG Hà Nội</button>
                  <button type="button" onClick={() => { setExamType("VSAT"); setMessage(null); }} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${examType === "VSAT" ? "bg-white text-teal-700 shadow-sm ring-1 ring-gray-200" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}>V-SAT</button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Điểm thực tế <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" min={selectedExam.min} max={selectedExam.max} value={examScore} onChange={(e) => { setExamScore(e.target.value); setMessage(null); }} placeholder={`Nhập điểm từ ${selectedExam.min} đến ${selectedExam.max}`} className="input-glow w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none placeholder:text-gray-400" />
              </div>
            </div>
          </div>

          {/* Nhóm 3: Điểm Cộng & Ưu Tiên */}
          <div className="rounded-2xl bg-gray-50/80 p-5 ring-1 ring-gray-200">
            <h3 className="mb-4 text-sm font-bold text-gray-800">3. Điểm Cộng & Ưu Tiên</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Điểm cộng</label>
                <input type="number" step="0.01" min="0" value={bonusPoints} onChange={(e) => { setBonusPoints(e.target.value); setMessage(null); }} placeholder="VD: 1.5" className="input-glow w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none placeholder:text-gray-400" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Điểm ưu tiên</label>
                <input type="number" step="0.01" min="0" value={priorityPoints} onChange={(e) => { setPriorityPoints(e.target.value); setMessage(null); }} placeholder="VD: 0.5" className="input-glow w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-gray-900 outline-none placeholder:text-gray-400" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">Có thể để trống nếu bạn không có điểm cộng hay ưu tiên.</p>
          </div>

          {/* Facebook link */}
          <div>
            <label htmlFor="facebookLink" className="mb-2 block text-sm font-semibold text-gray-700">Link Facebook cá nhân</label>
            <input id="facebookLink" type="url" value={facebookLink} onChange={(e) => { setFacebookLink(e.target.value); setMessage(null); }} placeholder="https://facebook.com/ten-cua-ban" className="input-glow w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400" />
            <p className="mt-2 text-xs text-gray-400">Nhập link FB để các anh chị dễ dàng liên hệ hỗ trợ bạn nhé!</p>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || cooldown > 0}
            className={`btn-gradient w-full rounded-xl px-5 py-3.5 font-semibold text-white shadow-lg shadow-teal-200 transition-transform active:scale-[0.98] ${(isLoading || cooldown > 0) ? "opacity-80" : ""} ${isLoading ? "shimmer" : ""
              }`}
          >
            <span>
              {isLoading ? "Đang xử lý..." : cooldown > 0 ? `Vui lòng đợi ${cooldown}s để tiếp tục` : "Xem Kết Quả & Lưu Thông Tin"}
            </span>
          </button>
        </form>

        {/* ── Message box ─────────────────────────────── */}
        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`fade-in-up mt-6 rounded-2xl border px-4 py-4 text-sm font-medium ${message.type === "success" ? "msg-success" : "msg-error"
              }`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-0.5 flex-shrink-0">
                {message.type === "success" ? (
                  <svg
                    className="h-5 w-5 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>

              <p>{message.text}</p>
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────── */}
        <p className="mt-8 text-center text-xs text-gray-400">
          © 2026 Chị Thái Bảo — Đại sứ Cham Toeic
        </p>
      </section>

      {/* ── Floating Facebook support button ──────────── */}
      <div className="float-bounce fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {/* Tooltip label */}
        <a
          href="https://www.facebook.com/monnnneee.988373"
          target="_blank"
          rel="noopener noreferrer"
          className="fb-tooltip hidden sm:flex items-center rounded-full bg-white px-4 py-2.5 shadow-lg shadow-gray-200/80 ring-1 ring-gray-100 transition-all duration-300 hover:shadow-xl"
        >
          <span className="text-sm font-semibold text-gray-700">
            Cần hỗ trợ? Ib chị nhé! 💬
          </span>
          {/* Arrow pointing right */}
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 bg-white ring-1 ring-gray-100 shadow-sm" />
        </a>

        {/* Messenger icon */}
        <a
          href="https://www.facebook.com/monnnneee.988373"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Liên hệ hỗ trợ qua Facebook"
          className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-300/50 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-blue-400/50 active:scale-95"
        >
          <svg
            className="h-7 w-7 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2.04c-5.5 0-10 4.13-10 9.23 0 2.9 1.44 5.49 3.7 7.18V22l3.52-1.93c.94.26 1.94.4 2.78.4 5.5 0 10-4.13 10-9.23S17.5 2.04 12 2.04zm1.07 12.43l-2.55-2.72-4.97 2.72 5.47-5.8 2.61 2.72 4.91-2.72-5.47 5.8z" />
          </svg>

          {/* Ping pulse ring */}
          <span className="absolute inset-0 rounded-full bg-blue-400 opacity-0 animate-ping" />
        </a>
      </div>
    </main>
  );
}