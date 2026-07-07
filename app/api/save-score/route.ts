import { NextRequest, NextResponse } from "next/server";

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

type SaveScorePayload = {
    fullName: string;
    sourceMethod: string;
    sourceScore: number;
    normalizedScore: number;
    comboType: string;
    resultPTXT4: string;
    resultPTXT2_1: string;
    resultPTXT2_2: string;
    resultPTXT2_3: string;
    resultPTXT3: string;
    hasIntlCert: boolean;
    surveyOption?: string;
    facebookLink?: string;
};

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

export async function POST(request: NextRequest) {
    if (!GOOGLE_SCRIPT_URL) {
        return NextResponse.json(
            { status: "error", message: "Server misconfiguration: GOOGLE_SCRIPT_URL is missing." },
            { status: 500 }
        );
    }

    try {
        const body = (await request.json()) as Partial<SaveScorePayload>;

        const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";

        if (!fullName) {
            return NextResponse.json(
                {
                    status: "error",
                    message: "Họ tên không được để trống.",
                },
                { status: 400 }
            );
        }

        if (typeof body.sourceMethod !== "string" || !body.sourceMethod) {
            return NextResponse.json(
                { status: "error", message: "Phương thức gốc không hợp lệ." },
                { status: 400 }
            );
        }

        if (!isFiniteNumber(body.sourceScore)) {
            return NextResponse.json(
                { status: "error", message: "Điểm trúng tuyển không hợp lệ." },
                { status: 400 }
            );
        }

        if (!isFiniteNumber(body.normalizedScore)) {
            return NextResponse.json(
                { status: "error", message: "Điểm chuẩn hóa không hợp lệ." },
                { status: 400 }
            );
        }

        if (typeof body.hasIntlCert !== "boolean") {
            return NextResponse.json(
                { status: "error", message: "Trạng thái chứng chỉ quốc tế không hợp lệ." },
                { status: 400 }
            );
        }

        const payload = {
            fullName,
            sourceMethod: body.sourceMethod,
            sourceScore: body.sourceScore,
            normalizedScore: body.normalizedScore,
            comboType: typeof body.comboType === "string" ? body.comboType : "N/A",
            resultPTXT4: typeof body.resultPTXT4 === "string" ? body.resultPTXT4 : "—",
            resultPTXT2_1: typeof body.resultPTXT2_1 === "string" ? body.resultPTXT2_1 : "—",
            resultPTXT2_2: typeof body.resultPTXT2_2 === "string" ? body.resultPTXT2_2 : "—",
            resultPTXT2_3: typeof body.resultPTXT2_3 === "string" ? body.resultPTXT2_3 : "—",
            resultPTXT3: typeof body.resultPTXT3 === "string" ? body.resultPTXT3 : "—",
            hasIntlCert: body.hasIntlCert ? "Có" : "Không",
            surveyOption: body.surveyOption?.trim() || "",
            facebookLink: body.facebookLink?.trim() || "",
            createdAt: new Date().toISOString(),
        };

        const googleResponse = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            cache: "no-store",
        });

        if (!googleResponse.ok) {
            return NextResponse.json(
                {
                    status: "error",
                    message: "Không thể lưu dữ liệu vào Google Sheets.",
                },
                { status: 502 }
            );
        }

        let googleData: unknown = null;

        try {
            googleData = await googleResponse.json();
        } catch {
            googleData = null;
        }

        // -- BẮT ĐẦU: GỬI THÔNG BÁO QUA TELEGRAM --
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
            const message = `🚨 <b>CÓ LEAD MỚI CẦN TƯ VẤN GẤP!</b>\n\n` +
                            `👤 Học sinh: <b>${payload.fullName}</b>\n` +
                            `📋 PT gốc: <b>${payload.sourceMethod}</b> | Điểm: <b>${payload.sourceScore}</b>` +
                            `${payload.comboType !== "N/A" ? ` (${payload.comboType} → D01: ${payload.normalizedScore})` : ""}\n` +
                            `🔄 <b>Quy đổi:</b>\n` +
                            `   PTXT 4: ${payload.resultPTXT4} | PTXT 2.1: ${payload.resultPTXT2_1}\n` +
                            `   PTXT 2.2: ${payload.resultPTXT2_2} | PTXT 2.3: ${payload.resultPTXT2_3}\n` +
                            `   PTXT 3: ${payload.resultPTXT3}\n` +
                            `📝 Khảo sát: <i>${payload.surveyOption || 'Không có'}</i>\n` +
                            `🎓 CCQT: ${payload.hasIntlCert}\n` +
                            `🔗 Facebook: ${payload.facebookLink || 'Không có'}`;

            // Không cần await để tránh làm chậm thời gian phản hồi cho học sinh
            fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'HTML'
                })
            }).catch(err => console.error("Telegram notification error:", err));
        }
        // -- KẾT THÚC: GỬI THÔNG BÁO QUA TELEGRAM --

        return NextResponse.json(
            {
                status: "success",
                message: "Đã lưu thông tin thành công.",
                data: googleData,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Save score error:", error);

        return NextResponse.json(
            {
                status: "error",
                message: "Có lỗi xảy ra khi xử lý yêu cầu.",
            },
            { status: 500 }
        );
    }
}