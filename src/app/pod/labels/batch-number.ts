/** "26102684": the 4 digits typed in (day and month made), the year, then the flavour's code. */
export const batchNumber = (digits: string, today: string, code: string) => `${digits}${today.slice(2, 4)}${code}`;

/** "28/10/2027" from "2027-10-28". */
export const labelDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
