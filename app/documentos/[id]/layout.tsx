import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Documento' }

export default function DocumentoLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 13px;
            line-height: 1.6;
            color: #1a1a1a;
            background: #f0f0f0;
          }
          .page {
            background: white;
            width: 210mm;
            min-height: 297mm;
            margin: 20px auto;
            padding: 18mm 20mm 20mm;
            box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          }
          @media print {
            body { background: white; }
            .page { margin: 0; box-shadow: none; width: 100%; }
            .no-print { display: none !important; }
          }
          .letterhead {
            display: flex;
            align-items: center;
            gap: 18px;
            border-bottom: 2px solid #1A1F2E;
            padding-bottom: 14px;
            margin-bottom: 8px;
          }
          .letterhead img { height: 64px; width: auto; object-fit: contain; }
          .letterhead-text h1 {
            font-size: 17px;
            font-weight: bold;
            color: #1A1F2E;
            letter-spacing: -0.02em;
          }
          .letterhead-text .sub { font-size: 11px; color: #666; margin-top: 2px; }
          .letterhead-right {
            margin-left: auto;
            text-align: right;
            font-size: 11px;
            color: #555;
          }
          .doc-date {
            font-size: 11px;
            color: #666;
            text-align: right;
            margin-bottom: 24px;
            margin-top: 4px;
          }
          .doc-title {
            font-size: 15px;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 20px;
            color: #1A1F2E;
          }
          .patient-info {
            background: #f8f8f8;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 10px 14px;
            margin-bottom: 20px;
            font-size: 12px;
          }
          .patient-info strong { color: #1A1F2E; }
          .doc-content {
            white-space: pre-wrap;
            line-height: 1.8;
            font-size: 13px;
            color: #222;
          }
          .signature-area {
            margin-top: 48px;
            border-top: 1px solid #ccc;
            padding-top: 14px;
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 24px;
          }
          .signature-left { flex: 1; }
          .signature-line {
            width: 240px;
            border-bottom: 1px solid #555;
            margin-bottom: 6px;
          }
          .signature-name { font-size: 12px; font-weight: bold; }
          .signature-crm  { font-size: 11px; color: #555; }
          .qr-block {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
          }
          .qr-block img { display: block; }
          .qr-label {
            font-size: 9px;
            color: #888;
            text-align: center;
            max-width: 88px;
            line-height: 1.3;
          }
          .print-btn {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1A1F2E;
            color: white;
            border: none;
            border-radius: 10px;
            padding: 10px 20px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(0,0,0,0.25);
            z-index: 100;
          }
          .print-btn:hover { background: #2d3448; }
        `}</style>
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', function() {
            var btn = document.getElementById('print-btn');
            if (btn) btn.addEventListener('click', function() { window.print(); });
          });
        `}} />
      </body>
    </html>
  )
}
