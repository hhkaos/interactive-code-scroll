-- #region top-categories
SELECT category, COUNT(*) AS places
FROM places
GROUP BY category
ORDER BY places DESC
LIMIT 10;
-- #endregion top-categories
