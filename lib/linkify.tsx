/**
 * lib/linkify.tsx
 *
 * Converts plain text with URLs into React elements where URLs are
 * rendered as clickable <a> tags.
 *
 * Usage:
 *   import { linkify } from '@/lib/linkify';
 *   <p>{linkify(text)}</p>
 */

import React from 'react';

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;

/**
 * Splits text into segments and wraps URLs in <a> tags.
 * Returns an array of strings and React anchor elements.
 */
export function linkify(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const [url] = match;
    const { index } = match;

    // Add text before the URL
    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index));
    }

    // Add the URL as a clickable link
    parts.push(
      <a
        key={`link-${index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline underline-offset-2 hover:text-blue-800 break-all transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );

    lastIndex = index + url.length;
  }

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Extracts all /report/ URLs from a text string.
 * Used to detect report links in forum posts and render preview cards.
 */
export function extractReportUrls(text: string): string[] {
  const urls: string[] = [];
  URL_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const url = match[0];
    try {
      const u = new URL(url);
      if (/^\/report\/[^/]+$/.test(u.pathname)) {
        urls.push(url);
      }
    } catch { /* not a valid URL */ }
  }
  return [...new Set(urls)]; // deduplicate
}
