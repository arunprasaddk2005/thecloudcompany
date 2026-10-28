import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { formatINR } from '../lib/format.js';

/** Phone numbers are shown only to the seller and the winner, after approval. The server enforces this. */
function ContactCard({ auctionId }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api(`/auctions/${auctionId}/contact`).then(setInfo).catch((e) => setError(e.message));
  }, [auctionId]);

  if (error) return null;
  if (!info) return null;
  return (
    <div className="rounded-md border border-pine/40 bg-white p-3">
      <p className="text-sm text-ink/60">{info.role === 'seller' ? 'Seller' : 'Winner'} contact for the campus handover</p>
      <p className="text-lg font-bold">{info.name}</p>
      <a href={`tel:${info.phone}`} className="num font-semibold text-pine underline">
        {info.phone}
      </a>
    </div>
  );
}

export default function SaleStatus({ auction: a, user }) {
  const isSeller = user && user.id === a.seller.id;
  const isWinner = user && a.winner && a.winner.id === user.id;
  const price = a.finalPrice ? formatINR(a.finalPrice) : null;

  let headline = null;
  let detail = null;
  switch (a.status) {
    case 'PENDING_APPROVAL':
      headline = `Winning bid: ${price} by ${a.winner?.name}`;
      detail = isWinner
        ? "You're the provisional winner. The seller is deciding whether to accept this price."
        : isSeller
        ? 'Review this price using the buttons below.'
        : 'Waiting for the seller to approve or reject this price.';
      break;
    case 'APPROVED':
      headline = `Reserved for ${a.winner?.name} at ${price}`;
      detail = isWinner ? 'The seller approved your price. Contact them to arrange the pickup on campus.' : 'The seller approved the price. Handover is being arranged.';
      break;
    case 'SOLD':
      headline = `Sold for ${price} to ${a.winner?.name}`;
      detail = 'The handover was confirmed. This sale is complete.';
      break;
    case 'UNSOLD':
      headline = 'Unsold';
      detail = a.outcomeReason || 'Nobody placed a bid.';
      break;
    case 'REJECTED':
      headline = 'The seller rejected the winning price';
      detail = a.outcomeReason;
      break;
    case 'CANCELLED':
      headline = 'This listing was cancelled';
      detail = a.outcomeReason;
      break;
    case 'PICKUP_FAILED':
      headline = 'The pickup did not happen';
      detail = a.outcomeReason;
      break;
    default:
      return null;
  }

  const showContact = (isSeller || isWinner) && ['APPROVED', 'SOLD'].includes(a.status);
  return (
    <div className="space-y-3">
      <div className="rounded-md bg-ink/5 p-3">
        <p className="font-semibold">{headline}</p>
        {detail && <p className="mt-1 text-base text-ink/70">{detail}</p>}
      </div>
      {showContact && <ContactCard auctionId={a.id} />}
    </div>
  );
}
