import { SITE, waLink } from '@/lib/config';
import { WhatsAppIcon } from './Icons';

export default function WhatsAppFab() {
  return (
    <a href={waLink(`Assalam o Alaikum, I have a question about ${SITE.name}.`)} target="_blank" rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-wa px-4 py-3 text-sm font-semibold text-[#04210f] shadow-xl">
      <WhatsAppIcon size={22} /><span className="hidden sm:inline">Chat on WhatsApp</span>
    </a>
  );
}
