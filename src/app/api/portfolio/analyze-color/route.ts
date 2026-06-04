import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'admin_session';

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME);
  return !!session;
}

// RGB → HSL 변환
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { image_url } = await request.json();
    if (!image_url || !image_url.includes('res.cloudinary.com')) {
      return NextResponse.json({ error: 'Invalid Cloudinary URL' }, { status: 400 });
    }

    // Cloudinary URL transformation으로 1x1 리사이즈 → 평균색 추출
    // c_scale,w_1,h_1 → 이미지를 1x1로 축소하면 평균색이 됨
    const colorUrl = image_url.replace('/upload/', '/upload/c_scale,w_1,h_1,f_json/');
    
    // Cloudinary JSON 응답에서 색상 정보 추출
    // 대안: 작은 이미지로 축소 후 색상 추출
    const thumbUrl = image_url.replace('/upload/', '/upload/c_fill,w_50,h_50,f_png/');
    
    // 50x50 썸네일에서 평균색 계산 (Canvas 대신 Cloudinary colors API 사용)
    // Cloudinary의 색상 정보를 가져오는 더 간단한 방법:
    // fl_getinfo 플래그 사용
    const infoUrl = image_url.replace('/upload/', '/upload/fl_getinfo/');
    
    let dominantColor: { h: number; s: number; l: number; isAchromatic: boolean } | null = null;
    
    try {
      // Cloudinary의 predominant color 가져오기
      const res = await fetch(infoUrl, { method: 'HEAD' });
      const colorHeader = res.headers.get('x-cld-color');
      
      if (colorHeader) {
        // Parse hex color
        const hex = colorHeader.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const hsl = rgbToHsl(r, g, b);
        dominantColor = { ...hsl, isAchromatic: hsl.s < 10 };
      }
    } catch {
      // fl_getinfo 실패 시 대안: 1x1 이미지 다운로드
    }
    
    // 대안: fl_getinfo가 안 되면 Cloudinary Admin API로 색상 정보 가져오기
    if (!dominantColor) {
      try {
        // public_id 추출
        const match = image_url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
        if (match) {
          const publicId = match[1];
          const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
          const apiKey = process.env.CLOUDINARY_API_KEY;
          const apiSecret = process.env.CLOUDINARY_API_SECRET;
          
          // Admin API로 색상 정보 가져오기
          const adminUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${publicId}?colors=true`;
          const authHeader = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
          
          const res = await fetch(adminUrl, {
            headers: { 'Authorization': `Basic ${authHeader}` },
          });
          
          if (res.ok) {
            const data = await res.json();
            if (data.colors && data.colors.length > 0) {
              // data.colors = [["#hex", percentage], ...]
              const hex = data.colors[0][0].replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              const hsl = rgbToHsl(r, g, b);
              dominantColor = { ...hsl, isAchromatic: hsl.s < 10 };
            }
          }
        }
      } catch (err) {
        console.error('Cloudinary Admin API color fetch failed:', err);
      }
    }
    
    if (dominantColor) {
      return NextResponse.json({ dominant_color: dominantColor });
    } else {
      return NextResponse.json({ error: 'Could not extract color' }, { status: 500 });
    }
  } catch (err) {
    console.error('Color analysis error:', err);
    return NextResponse.json({ error: 'Color analysis failed' }, { status: 500 });
  }
}
