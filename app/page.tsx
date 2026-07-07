"use client";

import { FormEvent, useState, useEffect } from "react";
import { Target, Zap, Gift, CheckCircle2, MessageCircle, ChevronDown, Info } from "lucide-react";

/* ═══════════════════════════ Types ═══════════════════════════ */

type MethodKey = "PTXT4" | "PTXT2_1" | "PTXT2_2" | "PTXT2_3" | "PTXT3";
type ComboKey = "D01" | "A01" | "D07" | "D09" | "D14" | "A00" | "C00" | "C03";

type SuccessResult = {
  targetMethod: MethodKey;
  convertedScore: number;
  quantileIndex: number;
  a: number;
  b: number;
  c: number;
  d: number;
};

type ErrorResult = {
  targetMethod: MethodKey;
  error: string;
};

type ConversionResult = SuccessResult | ErrorResult;

type Message = {
  type: "success" | "error";
  text: string;
};

type SaveScoreResponse = {
  status: "success" | "error";
  message?: string;
};

/* ═══════════════════════════ Constants ═══════════════════════ */

const ALL_METHODS: MethodKey[] = ["PTXT4", "PTXT2_1", "PTXT2_2", "PTXT2_3", "PTXT3"];

const METHOD_INFO: Record<MethodKey, { label: string; short: string; desc: string }> = {
  PTXT4: {
    label: "PTXT 4 — Điểm thi THPT 2026",
    short: "PTXT 4",
    desc: "Điểm thi tốt nghiệp THPT",
  },
  PTXT2_1: {
    label: "PTXT 2.1 — Học bạ + Chứng chỉ QT",
    short: "PTXT 2.1",
    desc: "Học bạ + Chứng chỉ Quốc tế",
  },
  PTXT2_2: {
    label: "PTXT 2.2 — Học bạ + HSA",
    short: "PTXT 2.2",
    desc: "Học bạ + HSA (ĐHQG Hà Nội)",
  },
  PTXT2_3: {
    label: "PTXT 2.3 — Học bạ + V-SAT",
    short: "PTXT 2.3",
    desc: "Học bạ + V-SAT",
  },
  PTXT3: {
    label: "PTXT 3 — Thành tích học tập",
    short: "PTXT 3",
    desc: "Thành tích học tập",
  },
};

/**
 * Bảng phân vị quy đổi tương đương mức điểm trúng tuyển.
 * Theo Thông báo Số: 3508/TB-HVNH ngày 07/07/2026.
 * null = "Không áp dụng" cho phương thức đó ở khoảng phân vị này.
 */
const QUANTILE_TABLE: {
  quantile: number;
  ranges: Record<MethodKey, [number, number] | null>;
}[] = [
  {
    quantile: 1,
    ranges: {
      PTXT4: [29, 30],
      PTXT2_1: null,
      PTXT2_2: null,
      PTXT2_3: null,
      PTXT3: null,
    },
  },
  {
    quantile: 2,
    ranges: {
      PTXT4: [28, 29],
      PTXT2_1: [29, 30],
      PTXT2_2: [29, 30],
      PTXT2_3: [29, 30],
      PTXT3: null,
    },
  },
  {
    quantile: 3,
    ranges: {
      PTXT4: [26, 28],
      PTXT2_1: [28, 29],
      PTXT2_2: [28, 29],
      PTXT2_3: [28, 29],
      PTXT3: [29, 30],
    },
  },
  {
    quantile: 4,
    ranges: {
      PTXT4: [24, 26],
      PTXT2_1: [26, 28],
      PTXT2_2: [26, 28],
      PTXT2_3: [26, 28],
      PTXT3: [27, 29],
    },
  },
  {
    quantile: 5,
    ranges: {
      PTXT4: [21.5, 24],
      PTXT2_1: [24, 26],
      PTXT2_2: [24, 26],
      PTXT2_3: [24, 26],
      PTXT3: [24, 27],
    },
  },
  {
    quantile: 6,
    ranges: {
      PTXT4: [19, 21.5],
      PTXT2_1: [21, 24],
      PTXT2_2: [21, 24],
      PTXT2_3: [21, 24],
      PTXT3: [21, 24],
    },
  },
];

/**
 * Mức chênh lệch tổ hợp so với D01 (chỉ áp dụng PTXT 4).
 * Dương = tổ hợp có cutoff CAO hơn D01. Âm = THẤP hơn D01.
 */
const COMBO_DELTA: Record<ComboKey, number> = {
  D01: 0,
  A01: 0,
  D07: 0,
  D09: 0,
  D14: 0,
  A00: 0.5,
  C00: -0.5,
  C03: -0.5,
};

const COMBO_OPTIONS: { key: ComboKey; label: string }[] = [
  { key: "D01", label: "D01 (Toán, Văn, Anh) — Tổ hợp gốc" },
  { key: "A01", label: "A01 (Toán, Lý, Anh) — Bằng D01" },
  { key: "A00", label: "A00 (Toán, Lý, Hóa) — Cao hơn D01: +0,5đ" },
  { key: "D07", label: "D07 (Toán, Hóa, Anh) — Bằng D01" },
  { key: "D09", label: "D09 (Toán, Sử, Anh) — Bằng D01" },
  { key: "D14", label: "D14 (Toán, Địa, Anh) — Bằng D01" },
  { key: "C00", label: "C00 (Văn, Sử, Địa) — Thấp hơn D01: −0,5đ" },
  { key: "C03", label: "C03 (Văn, Toán, Sử) — Thấp hơn D01: −0,5đ" },
];

/* ═══════════════════════════ Helpers ═══════════════════════ */

function isNumericInput(value: string) {
  return /^-?\d+(\.\d{1,2})?$/.test(value.trim());
}

/** Get min/max score from the quantile table for a given method. */
function getScoreRange(method: MethodKey): [number, number] {
  let min = 30;
  let max = 0;
  for (const row of QUANTILE_TABLE) {
    const range = row.ranges[method];
    if (range) {
      if (range[0] < min) min = range[0];
      if (range[1] > max) max = range[1];
    }
  }
  return [min, max];
}

/** Check if a score falls in any quantile range for the source method. */
function isInValidQuantile(x: number, sourceMethod: MethodKey): boolean {
  for (const row of QUANTILE_TABLE) {
    const range = row.ranges[sourceMethod];
    if (range && x >= range[0] && x <= range[1]) return true;
  }
  return false;
}

/**
 * Nội suy điểm quy đổi từ sourceMethod sang targetMethod.
 * Công thức: y = c + ((x - a) / (b - a)) * (d - c)
 * Iterates from Khoảng 1 (highest) downward — boundaries belong to higher khoảng.
 */
function interpolateScore(
  x: number,
  sourceMethod: MethodKey,
  targetMethod: MethodKey
): ConversionResult {
  let matchedIndex = -1;

  for (let i = 0; i < QUANTILE_TABLE.length; i++) {
    const sourceRange = QUANTILE_TABLE[i].ranges[sourceMethod];
    if (!sourceRange) continue;
    const [lower, upper] = sourceRange;
    if (x >= lower && x <= upper) {
      matchedIndex = i;
      break;
    }
  }

  if (matchedIndex === -1) {
    return {
      targetMethod,
      error: `Điểm nằm ngoài khoảng phân vị của ${METHOD_INFO[sourceMethod].short}.`,
    };
  }

  const targetRange = QUANTILE_TABLE[matchedIndex].ranges[targetMethod];
  if (!targetRange) {
    return {
      targetMethod,
      error: `Khoảng ${matchedIndex + 1} không áp dụng`,
    };
  }

  const sourceRange = QUANTILE_TABLE[matchedIndex].ranges[sourceMethod]!;
  const [a, b] = sourceRange;
  const [c, d] = targetRange;

  const y = b === a ? c : c + ((x - a) / (b - a)) * (d - c);
  const rounded = Math.round(y * 100) / 100;

  return {
    targetMethod,
    convertedScore: rounded,
    quantileIndex: matchedIndex,
    a,
    b,
    c,
    d,
  };
}

/** Convert a score to ALL other methods. */
function interpolateToAll(
  x: number,
  sourceMethod: MethodKey
): ConversionResult[] {
  return ALL_METHODS.filter((m) => m !== sourceMethod).map((target) =>
    interpolateScore(x, sourceMethod, target)
  );
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

/* ═══════════════════════════ Component ═══════════════════════ */

export default function HomePage() {
  /* ── Form state ────────────────────────────────────── */
  const [sourceMethod, setSourceMethod] = useState<MethodKey>("PTXT2_2");
  const [targetMethod, setTargetMethod] = useState<MethodKey>("PTXT4");
  const [sourceScore, setSourceScore] = useState("");
  const [comboType, setComboType] = useState<ComboKey>("D01");
  const [fullName, setFullName] = useState("");
  const [facebookLink, setFacebookLink] = useState("");
  const [hasIntlCert, setHasIntlCert] = useState(false);

  /* ── Result state ──────────────────────────────────── */
  const [results, setResults] = useState<ConversionResult[] | null>(null);
  const [matchedQuantile, setMatchedQuantile] = useState<number | null>(null);
  const [normalizedScore, setNormalizedScore] = useState<number | null>(null);

  /* ── UI state ──────────────────────────────────────── */
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showAdModal, setShowAdModal] = useState(false);
  const [surveyOption, setSurveyOption] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const [scoreMin, scoreMax] = getScoreRange(sourceMethod);

  /* ── Handlers ──────────────────────────────────────── */

  function handleSourceMethodChange(method: MethodKey) {
    setSourceMethod(method);
    if (method === targetMethod) {
      setTargetMethod(ALL_METHODS.find((m) => m !== method)!);
    }
    setComboType("D01");
    setResults(null);
    setMatchedQuantile(null);
    setNormalizedScore(null);
    setMessage(null);
  }

  function clearResults() {
    setResults(null);
    setMatchedQuantile(null);
    setNormalizedScore(null);
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setResults(null);
    setMatchedQuantile(null);

    /* Validate name */
    if (!fullName.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập họ tên." });
      return;
    }

    /* Validate score */
    const trimmedScore = sourceScore.trim();
    if (!trimmedScore || !isNumericInput(trimmedScore)) {
      setMessage({
        type: "error",
        text: "Vui lòng nhập điểm trúng tuyển hợp lệ (tối đa 2 chữ số thập phân).",
      });
      return;
    }

    let numScore = Number(trimmedScore);

    /* Apply combo delta for PTXT4 → normalize to D01 scale */
    if (sourceMethod === "PTXT4" && comboType !== "D01") {
      numScore = Math.round((numScore - COMBO_DELTA[comboType]) * 100) / 100;
    }

    /* Check range */
    if (numScore < scoreMin || numScore > scoreMax) {
      setMessage({
        type: "error",
        text: `Điểm ${METHOD_INFO[sourceMethod].short}${sourceMethod === "PTXT4" && comboType !== "D01" ? ` (quy đổi về D01: ${numScore})` : ""} phải nằm trong khoảng ${scoreMin} – ${scoreMax}.`,
      });
      return;
    }

    /* Check quantile validity */
    if (!isInValidQuantile(numScore, sourceMethod)) {
      setMessage({
        type: "error",
        text: `Điểm ${numScore} không nằm trong khoảng phân vị nào của ${METHOD_INFO[sourceMethod].short}. Phạm vi hợp lệ: ${scoreMin} – ${scoreMax}.`,
      });
      return;
    }

    /* Validate Facebook */
    if (!facebookLink.trim()) {
      setMessage({
        type: "error",
        text: "Vui lòng nhập Link Facebook (bắt buộc) để chuyên viên hỗ trợ.",
      });
      return;
    }
    const fbValidation = normalizeFacebookLink(facebookLink);
    if (fbValidation.error) {
      setMessage({ type: "error", text: fbValidation.error });
      return;
    }

    /* Store normalized score */
    setNormalizedScore(numScore);

    /* Show ad modal */
    setShowAdModal(true);
  }

  async function submitWithAd() {
    if (!surveyOption) return;

    setShowAdModal(false);
    setIsLoading(true);

    const numScore = normalizedScore!;
    const fbValidation = normalizeFacebookLink(facebookLink);

    /* Compute results */
    const conversionResults = [interpolateScore(numScore, sourceMethod, targetMethod)];

    /* Find matched quantile from first success */
    const firstSuccess = conversionResults.find(
      (r): r is SuccessResult => "convertedScore" in r
    );
    const qIndex = firstSuccess?.quantileIndex ?? null;

    setResults(conversionResults);
    setMatchedQuantile(qIndex);

    /* Build result map for API */
    const resultMap: Record<string, string> = {};
    for (const r of conversionResults) {
      if ("convertedScore" in r) {
        resultMap[r.targetMethod] = r.convertedScore.toFixed(2);
      } else {
        resultMap[r.targetMethod] = "N/A";
      }
    }

    try {
      const response = await fetch("/api/save-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          sourceMethod,
          sourceScore: Number(sourceScore.trim()),
          normalizedScore: numScore,
          comboType: sourceMethod === "PTXT4" ? comboType : "N/A",
          resultPTXT4: resultMap["PTXT4"] || "—",
          resultPTXT2_1: resultMap["PTXT2_1"] || "—",
          resultPTXT2_2: resultMap["PTXT2_2"] || "—",
          resultPTXT2_3: resultMap["PTXT2_3"] || "—",
          resultPTXT3: resultMap["PTXT3"] || "—",
          hasIntlCert,
          surveyOption,
          facebookLink: fbValidation.value,
        }),
      });

      const data = (await response.json().catch(() => null)) as SaveScoreResponse | null;

      if (!response.ok || data?.status !== "success") {
        setMessage({
          type: "success",
          text: "🎯 Đã quy đổi điểm thành công! Xem kết quả bên dưới.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "🎉 Tuyệt vời! Đã quy đổi điểm và lưu thông tin thành công! Chuẩn bị tinh thần đón tin vui thôi nào! ✨",
      });
    } catch (error) {
      console.error("Submit error:", error);
      setMessage({
        type: "success",
        text: "🎯 Đã quy đổi điểm thành công! Xem kết quả bên dưới.",
      });
    } finally {
      setIsLoading(false);
      setCooldown(30);
    }
  }

  /* ── First success result (for formula display) ──── */
  const formulaExample = results?.find(
    (r): r is SuccessResult => "convertedScore" in r
  );

  /* ═══════════════════════════ JSX ═══════════════════════════ */

  return (
    <main className="bg-clean relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Subtle decorative blobs */}
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />
      <div className="blob blob-3" aria-hidden="true" />
      <div className="blob blob-4" aria-hidden="true" />

      <div className="w-full max-w-7xl mx-auto flex items-start justify-center lg:justify-between gap-12 z-10 relative">

        {/* ══ Left Column: Branding & Marketing (Desktop only) ══ */}
        <div className="hidden lg:flex w-full lg:w-[55%] flex-col justify-center text-left sticky top-10">
          <div className="inline-block mb-6 bg-white/60 backdrop-blur-md border border-teal-100 rounded-full px-5 py-2 w-max shadow-sm">
            <span className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-cyan-600 uppercase tracking-wider">
              ✨ Cập nhật TB 3508/HVNH — 07/2026
            </span>
          </div>

          <h1 className="text-5xl xl:text-[4rem] font-extrabold text-gray-900 leading-[1.15] mb-6 tracking-tight drop-shadow-sm">
            Quy Đổi Điểm <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-600">
              Trúng Tuyển
            </span>
          </h1>

          <p className="text-xl text-gray-700 mb-10 max-w-lg leading-relaxed">
            Hệ thống nội suy điểm tương đương giữa 5 phương thức xét tuyển
            của Học viện Ngân hàng năm 2026. Nhập điểm và xem ngay kết quả quy
            đổi sang tất cả các phương thức!
          </p>

          {/* Decorative badges */}
          <div className="flex flex-wrap gap-4 mb-10">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
              <Target className="w-6 h-6 text-teal-600" />
              <span className="text-sm font-bold text-gray-800">Công thức chuẩn</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
              <Zap className="w-6 h-6 text-amber-500" />
              <span className="text-sm font-bold text-gray-800">5 phương thức</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
              <Gift className="w-6 h-6 text-rose-500" />
              <span className="text-sm font-bold text-gray-800">Tư vấn 1:1 VIP</span>
            </div>
          </div>

          {/* Floor scores info box */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 ring-1 ring-gray-200 shadow-sm mb-6">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-teal-600" />
              Ngưỡng ĐBCL đầu vào (PTXT 4)
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-teal-50 px-4 py-2.5 ring-1 ring-teal-100">
                <div className="text-xs text-gray-500 mb-0.5">Chuẩn & CLC</div>
                <div className="font-bold text-teal-700">21,5 điểm</div>
              </div>
              <div className="rounded-xl bg-cyan-50 px-4 py-2.5 ring-1 ring-cyan-100">
                <div className="text-xs text-gray-500 mb-0.5">Liên kết QT</div>
                <div className="font-bold text-cyan-700">19,0 điểm</div>
              </div>
            </div>
          </div>

          {/* Combo delta info box */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-5 ring-1 ring-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-500" />
              Chênh lệch tổ hợp (PTXT 4, so với D01)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="text-gray-600">A01, D07, D09, D14</span>
                <span className="font-semibold text-gray-700">= D01 (±0)</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                <span className="text-gray-600">A00</span>
                <span className="font-bold text-amber-700">+0,5 điểm</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
                <span className="text-gray-600">C00, C03</span>
                <span className="font-bold text-blue-700">−0,5 điểm</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ Right Column: The Form Card ══════════════════════ */}
        <div className="w-full lg:w-[48%] flex justify-center lg:justify-end">
          <section className="card fade-in-up w-full max-w-2xl rounded-3xl p-6 shadow-xl shadow-gray-200/60 sm:p-8">

            {/* ── Header ─────────────────────────────── */}
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
                Quy Đổi Điểm Trúng Tuyển
              </h1>

              <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-600">
                <p>
                  Công cụ nội suy điểm tương đương giữa các phương thức xét tuyển
                  theo <strong>Thông báo 3508/TB-HVNH</strong> của Học viện Ngân hàng.
                  Nhập điểm trúng tuyển ở một phương thức để xem điểm tương đương
                  ở tất cả phương thức còn lại.
                </p>
                <p>
                  Hãy xem ngay điểm quy đổi của bạn và cho phép tụi mình – những
                  anh chị đi trước, được đồng hành cùng bạn vẽ nên lộ trình tương
                  lai thật vững chắc nhé!
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
                  onClick={() => setShowTable(!showTable)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:text-teal-600 cursor-pointer"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${showTable ? "rotate-180" : ""}`}
                  />
                  {showTable ? "Ẩn bảng phân vị" : "Xem bảng phân vị"}
                </button>
              </div>
            </div>

            {/* ── Quantile Table ─────────────────────── */}
            {showTable && (
              <div className="mb-8 fade-in-up">
                <div className="overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-b from-white to-teal-50/30">
                  <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-4 py-2.5">
                    <h3 className="text-sm font-bold text-white text-center">
                      Bảng phân vị quy đổi tương đương (Thang 30)
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-teal-100 bg-teal-50/50">
                          <th className="px-3 py-2.5 text-center font-semibold text-gray-600 w-20">
                            Phân vị
                          </th>
                          {ALL_METHODS.map((m) => (
                            <th
                              key={m}
                              className="px-3 py-2.5 text-center font-semibold text-gray-600"
                            >
                              {METHOD_INFO[m].short}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {QUANTILE_TABLE.map((row, idx) => {
                          const isHighlighted = matchedQuantile === idx;
                          return (
                            <tr
                              key={row.quantile}
                              className={`border-b border-teal-50 transition-all duration-300 ${
                                isHighlighted
                                  ? "bg-teal-100/80 ring-2 ring-inset ring-teal-400"
                                  : idx % 2 === 0
                                    ? "bg-white hover:bg-teal-50/40"
                                    : "bg-teal-50/20 hover:bg-teal-50/40"
                              }`}
                            >
                              <td className="px-3 py-2.5 text-center">
                                <span
                                  className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                                    isHighlighted
                                      ? "bg-teal-600 text-white shadow-sm"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {row.quantile}
                                </span>
                              </td>
                              {ALL_METHODS.map((m) => {
                                const range = row.ranges[m];
                                return (
                                  <td
                                    key={m}
                                    className="px-3 py-2.5 text-center"
                                  >
                                    {range ? (
                                      <span
                                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                          isHighlighted
                                            ? "bg-teal-200/60 text-teal-800"
                                            : "bg-gray-100 text-gray-700"
                                        }`}
                                      >
                                        {range[0].toFixed(1)} – {range[1].toFixed(1)}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-300">
                                        —
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2.5 bg-gray-50 border-t border-teal-100">
                    <p className="text-xs text-gray-400 text-center">
                      Căn cứ Thông báo Số 3508/TB-HVNH ngày 07/07/2026 — Học viện Ngân hàng (NHH)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Form ───────────────────────────────── */}
            <form onSubmit={handleSubmit} noValidate className="space-y-6">

              {/* Section 1: Phương thức & Điểm */}
              <div className="rounded-2xl bg-gray-50/80 p-5 ring-1 ring-gray-200">
                <h3 className="mb-4 text-sm font-bold text-gray-800">
                  1. Phương thức \u0026 Điểm trúng tuyển
                </h3>
                <div className="space-y-4">
                  {/* Source method select */}
                  <div>
                    <label
                      htmlFor="sourceMethod"
                      className="mb-1.5 block text-xs font-semibold text-gray-700"
                    >
                      Phương thức gốc{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="sourceMethod"
                      value={sourceMethod}
                      onChange={(e) =>
                        handleSourceMethodChange(e.target.value as MethodKey)
                      }
                      className="input-glow w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none cursor-pointer appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                        paddingRight: "40px",
                      }}
                    >
                      {ALL_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {METHOD_INFO[m].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Source score input */}
                  <div>
                    <label
                      htmlFor="sourceScore"
                      className="mb-1.5 block text-xs font-semibold text-gray-700"
                    >
                      Điểm trúng tuyển{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="sourceScore"
                      type="number"
                      step="0.01"
                      min={scoreMin}
                      max={scoreMax}
                      value={sourceScore}
                      onChange={(e) => {
                        setSourceScore(e.target.value);
                        clearResults();
                      }}
                      placeholder={`Nhập từ ${scoreMin} đến ${scoreMax} (thang 30)`}
                      className="input-glow w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400"
                    />
                    <p className="mt-1.5 text-xs text-gray-400">
                      Mức điểm đã bao gồm cả điểm cộng, điểm thưởng và ưu tiên (nếu có).
                    </p>
                  </div>

                  {/* Combo type (only for PTXT4) */}
                  {sourceMethod === "PTXT4" && (
                    <div className="fade-in-up">
                      <label
                        htmlFor="comboType"
                        className="mb-1.5 block text-xs font-semibold text-gray-700"
                      >
                        Tổ hợp môn thi{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="comboType"
                        value={comboType}
                        onChange={(e) => {
                          setComboType(e.target.value as ComboKey);
                          clearResults();
                        }}
                        className="input-glow w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none cursor-pointer appearance-none"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                          paddingRight: "40px",
                        }}
                      >
                        {COMBO_OPTIONS.map((opt) => (
                          <option key={opt.key} value={opt.key}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {comboType !== "D01" && (
                        <p className="mt-1.5 text-xs text-amber-600 font-medium">
                          ⚠ Điểm sẽ được chuẩn hóa về D01 (
                          {COMBO_DELTA[comboType] > 0 ? "−" : "+"}
                          {Math.abs(COMBO_DELTA[comboType])}đ) trước khi quy đổi.
                        </p>
                      )}
                    </div>
                  )}


                  {/* Target method select */}
                  <div>
                    <label
                      htmlFor="targetMethod"
                      className="mb-1.5 block text-xs font-semibold text-gray-700"
                    >
                      Phương thức đích{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="targetMethod"
                      value={targetMethod}
                      onChange={(e) => {
                        setTargetMethod(e.target.value as MethodKey);
                        clearResults();
                      }}
                      className="input-glow w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none cursor-pointer appearance-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 12px center",
                        paddingRight: "40px",
                      }}
                    >
                      {ALL_METHODS.filter((m) => m !== sourceMethod).map((m) => (
                        <option key={m} value={m}>
                          {METHOD_INFO[m].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Thông tin cá nhân */}
              <div className="rounded-2xl bg-gray-50/80 p-5 ring-1 ring-gray-200">
                <h3 className="mb-4 text-sm font-bold text-gray-800">
                  2. Thông tin cá nhân
                </h3>
                <div className="space-y-4">
                  {/* Full name */}
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-1.5 block text-xs font-semibold text-gray-700"
                    >
                      Họ và tên{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setMessage(null);
                      }}
                      placeholder="Nguyễn Văn A"
                      className="input-glow w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>

                  {/* Facebook link */}
                  <div>
                    <label
                      htmlFor="facebookLink"
                      className="mb-1.5 block text-xs font-semibold text-gray-700"
                    >
                      Link Facebook cá nhân{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="facebookLink"
                      type="url"
                      value={facebookLink}
                      onChange={(e) => {
                        setFacebookLink(e.target.value);
                        setMessage(null);
                      }}
                      placeholder="https://facebook.com/ten-cua-ban"
                      className="input-glow w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400"
                    />
                    <p className="mt-1.5 text-xs text-gray-400">
                      Nhập link FB để các anh chị dễ dàng liên hệ hỗ trợ bạn nhé!
                    </p>
                  </div>

                  {/* International certificate toggle */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                      Chứng chỉ quốc tế
                    </label>
                    <div className="flex rounded-xl bg-gray-200/50 p-1 ring-1 ring-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          setHasIntlCert(true);
                          setMessage(null);
                        }}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          hasIntlCert
                            ? "bg-white text-teal-700 shadow-sm ring-1 ring-gray-200"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        Có
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHasIntlCert(false);
                          setMessage(null);
                        }}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          !hasIntlCert
                            ? "bg-white text-teal-700 shadow-sm ring-1 ring-gray-200"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        Không
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || cooldown > 0}
                className={`btn-gradient w-full cursor-pointer disabled:cursor-not-allowed rounded-xl px-5 py-3.5 font-semibold text-white shadow-lg shadow-teal-200 transition-transform active:scale-95 ${
                  isLoading || cooldown > 0 ? "opacity-50" : ""
                } ${isLoading ? "shimmer" : ""}`}
              >
                <span>
                  {isLoading
                    ? "Đang xử lý..."
                    : cooldown > 0
                      ? `Vui lòng đợi ${cooldown}s`
                      : "Quy Đổi & Xem Kết Quả"}
                </span>
              </button>
            </form>

            {/* ── Results Display ─────────────────────── */}
            {results && (
              <div className="mt-8 fade-in-up">
                {/* Summary header */}
                <div className="rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 p-5 text-white mb-5 shadow-lg shadow-teal-200/50">
                  <div className="flex items-center gap-2 mb-3">
                    <svg
                      className="w-5 h-5"
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
                    <h3 className="font-bold text-lg">Kết Quả Quy Đổi</h3>
                  </div>
                  <div className="space-y-1 text-sm text-teal-100">
                    <p>
                      <span className="text-white/70">Phương thức gốc:</span>{" "}
                      <strong className="text-white">
                        {METHOD_INFO[sourceMethod].short}
                      </strong>
                    </p>
                    <p>
                      <span className="text-white/70">Điểm nhập:</span>{" "}
                      <strong className="text-white">
                        {Number(sourceScore.trim()).toFixed(2)}
                      </strong>
                      {sourceMethod === "PTXT4" &&
                        comboType !== "D01" &&
                        normalizedScore !== null && (
                          <span className="text-teal-200 ml-1">
                            ({comboType} → D01: {normalizedScore.toFixed(2)})
                          </span>
                        )}
                    </p>
                    {matchedQuantile !== null && (
                      <p>
                        <span className="text-white/70">Phân vị:</span>{" "}
                        <strong className="text-white">
                          Khoảng {matchedQuantile + 1}
                        </strong>
                        {QUANTILE_TABLE[matchedQuantile]?.ranges[sourceMethod] && (
                          <span className="text-teal-200 ml-1">
                            ({QUANTILE_TABLE[matchedQuantile].ranges[sourceMethod]![0].toFixed(1)}{" "}
                            –{" "}
                            {QUANTILE_TABLE[matchedQuantile].ranges[sourceMethod]![1].toFixed(1)})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Result cards grid */}
                <div className="grid grid-cols-1 gap-3 mb-5">
                  {results.map((r) => {
                    const isSuccess = "convertedScore" in r;
                    const info = METHOD_INFO[r.targetMethod];

                    if (isSuccess) {
                      const s = r as SuccessResult;
                      return (
                        <div
                          key={s.targetMethod}
                          className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-4 ring-1 ring-emerald-200 hover:shadow-md transition-shadow"
                        >
                          <div className="text-xs font-semibold text-gray-500 mb-1">
                            {info.short}
                          </div>
                          <div className="text-xs text-gray-400 mb-2">
                            {info.desc}
                          </div>
                          <div className="text-3xl font-extrabold text-emerald-700 mb-1">
                            {s.convertedScore.toFixed(2)}
                          </div>
                          <div className="text-xs text-emerald-600/70">
                            Khoảng {s.quantileIndex + 1}: {s.c.toFixed(1)} –{" "}
                            {s.d.toFixed(1)}
                          </div>
                        </div>
                      );
                    } else {
                      const e = r as ErrorResult;
                      return (
                        <div
                          key={e.targetMethod}
                          className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200 opacity-60"
                        >
                          <div className="text-xs font-semibold text-gray-400 mb-1">
                            {info.short}
                          </div>
                          <div className="text-xs text-gray-300 mb-2">
                            {info.desc}
                          </div>
                          <div className="text-lg font-bold text-gray-400 mb-1">
                            Không áp dụng
                          </div>
                          <div className="text-xs text-gray-300">
                            {e.error}
                          </div>
                        </div>
                      );
                    }
                  })}
                </div>

                {/* Formula toggle */}
                <button
                  type="button"
                  onClick={() => setShowFormula(!showFormula)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-gray-500 ring-1 ring-gray-200 transition-all hover:bg-gray-50 hover:text-teal-600 cursor-pointer mb-4"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${showFormula ? "rotate-180" : ""}`}
                  />
                  {showFormula
                    ? "Ẩn chi tiết công thức"
                    : "Xem chi tiết công thức nội suy"}
                </button>

                {showFormula && formulaExample && (
                  <div className="fade-in-up rounded-2xl bg-gray-50 p-5 ring-1 ring-gray-200 text-sm mb-4">
                    <h4 className="font-bold text-gray-800 mb-3">
                      Công thức nội suy tuyến tính
                    </h4>
                    <div className="bg-white rounded-xl p-4 ring-1 ring-gray-100 mb-3 font-mono text-center text-base">
                      y = c + (x − a) / (b − a) × (d − c)
                    </div>
                    <div className="space-y-1 text-gray-600 mb-3">
                      <p>
                        <strong>x</strong> = {normalizedScore?.toFixed(2)} (điểm
                        gốc{sourceMethod === "PTXT4" && comboType !== "D01" ? ", đã chuẩn hóa về D01" : ""})
                      </p>
                      <p>
                        <strong>a</strong> = {formulaExample.a}, <strong>b</strong>{" "}
                        = {formulaExample.b} (khoảng phân vị nguồn:{" "}
                        {METHOD_INFO[sourceMethod].short})
                      </p>
                      <p>
                        <strong>c</strong> = {formulaExample.c}, <strong>d</strong>{" "}
                        = {formulaExample.d} (khoảng phân vị đích:{" "}
                        {METHOD_INFO[formulaExample.targetMethod].short})
                      </p>
                    </div>
                    <div className="bg-teal-50 rounded-xl p-4 ring-1 ring-teal-100 font-mono text-center">
                      y = {formulaExample.c} + ({normalizedScore?.toFixed(2)} −{" "}
                      {formulaExample.a}) / ({formulaExample.b} −{" "}
                      {formulaExample.a}) × ({formulaExample.d} −{" "}
                      {formulaExample.c}) ={" "}
                      <strong className="text-teal-700">
                        {formulaExample.convertedScore.toFixed(2)}
                      </strong>
                    </div>
                    <p className="mt-3 text-xs text-gray-400 italic">
                      * Mức điểm quy đổi đã bao gồm cả điểm cộng, điểm thưởng và
                      ưu tiên.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Message box ────────────────────────── */}
            {message && (
              <div
                role="status"
                aria-live="polite"
                className={`fade-in-up mt-6 rounded-2xl border px-4 py-4 text-sm font-medium ${
                  message.type === "success" ? "msg-success" : "msg-error"
                }`}
              >
                <div className="flex items-start gap-3">
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

            {/* ── Footer ─────────────────────────────── */}
            <p className="mt-8 text-center text-xs text-gray-400">
              © 2026 Chị Thái Bảo — Đại sứ Cham Toeic
            </p>
          </section>
        </div>
        {/* End Right Column */}
      </div>
      {/* End 2-column flex */}

      {/* ── Floating Facebook support button ────────── */}
      <div className="float-bounce fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <a
          href="https://www.facebook.com/monnnneee.988373"
          target="_blank"
          rel="noopener noreferrer"
          className="fb-tooltip hidden sm:flex items-center rounded-full bg-white px-4 py-2.5 shadow-lg shadow-gray-200/80 ring-1 ring-gray-100 transition-all duration-300 hover:shadow-xl"
        >
          <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            Cần hỗ trợ? Ib chị nhé!{" "}
            <MessageCircle className="w-4 h-4 text-teal-600" />
          </span>
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 bg-white ring-1 ring-gray-100 shadow-sm" />
        </a>

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
          <span className="absolute inset-0 rounded-full bg-blue-400 opacity-0 animate-ping" />
        </a>
      </div>

      {/* ── Ad Modal ─────────────────────────────────── */}
      {showAdModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm transition-all duration-300">
          <div className="fade-in-up flex w-full max-w-xl max-h-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="overflow-y-auto p-5 sm:p-8">
              {/* Banner Image */}
              <div className="mb-6 overflow-hidden rounded-xl ring-1 ring-gray-100 shadow-sm">
                <img
                  src="/ccta-banner.jpg"
                  alt="Lợi ích học TOEIC"
                  className="w-full h-auto object-cover"
                />
              </div>

              <div className="mb-6 rounded-2xl bg-teal-50/50 p-5 ring-1 ring-teal-100">
                <p className="mb-3 text-sm font-semibold text-gray-800">
                  Chị đang hỗ trợ chứng chỉ tiếng Anh (CCTA) cho các bạn với
                  mục tiêu:
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
                    Vượt kì thi Tiếng Anh đầu vào tháng 9-10
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
                    Miễn học phần TA, quy đổi full 10
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
                    Không trượt môn, không học lạt
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
                    Học TA ĐH nhẹ nhàng hơn, GPA cao săn học bổng
                  </li>
                </ul>
                <p className="mt-3 text-sm italic text-gray-600">
                  Chị sẽ mở các buổi Zoom 1:1 hoặc nhóm nhỏ để chia sẻ kinh
                  nghiệm học &amp; thi, định hướng môi trường phù hợp + hỗ trợ
                  voucher/slots VIP tại Cham TOEIC.
                </p>
              </div>

              {/* Survey Options */}
              <div className="mb-8 space-y-3">
                <label className="block text-sm font-bold text-gray-800">
                  Khảo sát nhanh (Bắt buộc chọn để xem điểm):
                </label>

                {[
                  {
                    value: "Tư vấn CCTA - Nhận voucher/slot VIP",
                    label:
                      "Em muốn chị tư vấn về CCTA ở CHAM TOEIC - Em muốn nhận voucher, slot lớp VIP để học",
                  },
                  {
                    value: "Em mất gốc",
                    label: "Em mất gốc huhu",
                  },
                  {
                    value: "Có IELTS nhưng muốn tìm hiểu TOEIC",
                    label:
                      "Em có IELTS rùi ạ nhưng muốn tìm hiểu TOEIC sau thi",
                  },
                  {
                    value: "Em đang học/Đã có chứng chỉ",
                    label: "Em đang học (đã có) chứng chỉ rồi ạ",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 transition-all duration-200 ${
                      surveyOption === option.value
                        ? "bg-teal-50 ring-teal-500"
                        : "bg-white ring-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex h-5 items-center">
                      <input
                        type="radio"
                        name="survey"
                        className="h-4 w-4 text-teal-600 focus:ring-teal-500"
                        checked={surveyOption === option.value}
                        onChange={() => setSurveyOption(option.value)}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAdModal(false)}
                  className="cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  disabled={!surveyOption}
                  onClick={submitWithAd}
                  className={`cursor-pointer disabled:cursor-not-allowed rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all ${
                    surveyOption
                      ? "bg-gradient-to-r from-teal-500 to-cyan-600 hover:shadow-teal-300/50"
                      : "bg-gray-300"
                  }`}
                >
                  Xác nhận &amp; Xem điểm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}