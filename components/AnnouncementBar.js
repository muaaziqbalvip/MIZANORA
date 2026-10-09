import { SITE } from '@/lib/config';

export default function AnnouncementBar() {
  if (!SITE.announcement) return null;
  return (
    <div className="bg-gold px-3 py-1.5 text-center text-xs font-semibold text-ink sm:text-sm">
      {SITE.announcement}
    </div>
  );
}
