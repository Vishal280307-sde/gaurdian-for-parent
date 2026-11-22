import React, { useState } from "react";

interface VisualAssetProps {
  src: string;
  alt: string;
  caption?: string;
  lazy?: boolean;
  className?: string;
  imgClassName?: string;
}

export const VisualAsset: React.FC<VisualAssetProps> = ({
  src,
  alt,
  caption,
  lazy = true,
  className = "",
  imgClassName = "w-full h-full object-cover",
}) => {
  const [failed, setFailed] = useState(false);

  return (
    <figure
      className={`overflow-hidden rounded-xl border border-[#E4DCCB] dark:border-[#1E3256] bg-[#0B162C] shadow-xs ${className}`}
    >
      {failed ? (
        <div
          role="img"
          aria-label={alt}
          className="w-full h-full min-h-[96px] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0B162C] to-[#16325B] text-[#E5CA8B]"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 48 48"
            className="w-10 h-10 text-[#C8A45D]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M24 6l14 5.5v10.5c0 9.4-6 17.5-14 20.5C16 39.5 10 31.4 10 22V11.5L24 6z" />
            <path d="M18.5 24l3.8 3.8 7.2-7.6" />
          </svg>
          <span className="mt-2 text-[11px] font-medium text-[#CBD5E7] text-center line-clamp-2">
            {alt}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={lazy ? "lazy" : "eager"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={imgClassName}
        />
      )}
      {caption && (
        <figcaption className="px-3 py-1.5 text-[11px] text-[#CBD5E7] bg-[#091224] border-t border-[#1E3256]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

interface EmptyStateCardProps {
  title: string;
  description: string;
  compact?: boolean;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  title,
  description,
  compact = false,
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-[#E4DCCB] dark:border-[#1E3256] bg-[#FAF7F0]/75 dark:bg-[#091224]/80 ${
        compact ? "p-3.5" : "p-4 sm:p-5"
      }`}
    >
      <VisualAsset
        src="/src/assets/images/security_empty_state_1795331541347.jpg"
        alt={title}
        lazy={true}
        className={`${compact ? "w-20" : "w-24 sm:w-28"} aspect-[4/3] shrink-0`}
      />
      <div className="min-w-0 text-center sm:text-left">
        <p className="text-sm font-semibold text-[#0B162C] dark:text-[#F5F0E4]">{title}</p>
        <p className="mt-1 text-xs text-[#525E75] dark:text-[#9BAAC4] leading-relaxed">{description}</p>
      </div>
    </div>
  );
};
