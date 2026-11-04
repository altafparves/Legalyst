import { Info } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <div className="w-full rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-amber-900 sm:text-sm">
      <div className="flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-amber-950">Catatan Kepatuhan: </strong>
          Legalyst adalah asisten co-pilot panduan kepatuhan mandiri untuk UMKM, bukan penasihat
          hukum atau kantor advokat resmi. Seluruh pengajuan izin resmi tetap diproses melalui
          portal OSS dan instansi terkait.
        </p>
      </div>
    </div>
  );
}

