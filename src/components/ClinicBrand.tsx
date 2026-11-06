const logo = { url: "/clinic-logo.png" };

export const CLINIC = {
  name: "KILINIKA G/GALEESSA TUUDII",
  amharic: "ቱዲ መካከለኛ ክሊኒክ",
  english: "TWO D MEDIUM CLINIC",
  phones: "0992540474 / 0913591670",
};

export function ClinicLogo({ className = "h-12 w-12" }: { className?: string }) {
  return <img src={logo.url} alt="Two D Medium Clinic logo" className={`${className} rounded-full bg-card object-contain`} />;
}

/** Header copied from the clinic's paper forms, used on printouts. */
export function PrintHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 border-b-2 border-primary pb-3">
      <ClinicLogo className="h-20 w-20" />
      <div className="flex-1">
        <div className="text-lg font-bold text-foreground">{CLINIC.name}</div>
        <div className="text-sm">{CLINIC.amharic}</div>
        <div className="text-sm font-semibold tracking-wide">{CLINIC.english}</div>
        <div className="text-xs text-muted-foreground">Tel: {CLINIC.phones}</div>
      </div>
      <div className="text-right text-xl font-bold text-primary underline underline-offset-4">{title}</div>
    </div>
  );
}
