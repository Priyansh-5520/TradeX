/**
 * NSE/BSE regular session: Monday–Friday, 09:15–15:30 Asia/Kolkata.
 * Exchange holiday calendars are not exposed by the current market-data
 * provider, so this safely enforces regular session hours; add a holiday feed
 * later if holiday-level execution blocking is required.
 */
const getIndianMarketStatus = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

  const weekday = parts.weekday;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const isWeekday = weekday !== "Sat" && weekday !== "Sun";
  return {
    isOpen: isWeekday && minutes >= 9 * 60 + 15 && minutes < 15 * 60 + 30,
    session: "NSE/BSE regular session, 09:15–15:30 IST, Monday–Friday",
  };
};

module.exports = { getIndianMarketStatus };
