import { NextRequest, NextResponse } from "next/server";

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

type SaveScorePayload = {
    fullName: string;
    hocBaM1: number;
    hocBaM2: number;
    hocBaM3: number;
    examType: "HSA" | "VSAT";
    examScore: number;
    bonusPoints: number;
    priorityPoints: number;
    finalScore: number;
    facebookLink?: string;
};

function isValidExamType(value: unknown): value is SaveScorePayload["examType"] {
    return value === "HSA" || value === "VSAT";
}

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

        if (!isFiniteNumber(body.hocBaM1) || !isFiniteNumber(body.hocBaM2) || !isFiniteNumber(body.hocBaM3)) {
            return NextResponse.json(
                { status: "error", message: "Điểm học bạ không hợp lệ." },
                { status: 400 }
            );
        }

        if (!isValidExamType(body.examType)) {
            return NextResponse.json(
                {
                    status: "error",
                    message: "Loại kỳ thi không hợp lệ.",
                },
                { status: 400 }
            );
        }

        if (!isFiniteNumber(body.examScore)) {
            return NextResponse.json(
                {
                    status: "error",
                    message: "Điểm ĐGNL không hợp lệ.",
                },
                { status: 400 }
            );
        }

        if (!isFiniteNumber(body.bonusPoints) || !isFiniteNumber(body.priorityPoints)) {
            return NextResponse.json(
                { status: "error", message: "Điểm cộng hoặc ưu tiên không hợp lệ." },
                { status: 400 }
            );
        }

        if (!isFiniteNumber(body.finalScore)) {
            return NextResponse.json(
                {
                    status: "error",
                    message: "Điểm xét tuyển không hợp lệ.",
                },
                { status: 400 }
            );
        }

        const payload = {
            fullName,
            hocBaM1: body.hocBaM1,
            hocBaM2: body.hocBaM2,
            hocBaM3: body.hocBaM3,
            examType: body.examType,
            examScore: body.examScore,
            bonusPoints: body.bonusPoints,
            priorityPoints: body.priorityPoints,
            finalScore: body.finalScore,
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