import { useEffect, useState } from "react";
import type { NewsItem } from "../../../shared/src/types";

export function useBottomPanelNews(symbolId: string) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const response = await fetch(`/api/news?symbol=${encodeURIComponent(symbolId)}`);
        if (response.ok) {
          const data = await response.json();
          setNews(data.news);
        }
      } catch (err) {
        console.error("Failed fetching news:", err);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  }, [symbolId]);

  return { news, newsLoading };
}