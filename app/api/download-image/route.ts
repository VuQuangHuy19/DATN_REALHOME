import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  const customFilename = searchParams.get('filename');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch original image' }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();

    // Determine filename
    let filename = customFilename;
    if (!filename) {
      const urlPath = new URL(imageUrl).pathname;
      const originalName = urlPath.split('/').pop() || 'anh-phong.jpg';
      filename = originalName.includes('.') ? originalName : `${originalName}.jpg`;
    }

    // Return response with Content-Disposition attachment to force direct browser download
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[DownloadImageProxy] Error fetching image:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
