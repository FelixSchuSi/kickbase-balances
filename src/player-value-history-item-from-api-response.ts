export interface PlayerValueHistoryItem {
	day: Date;
	value: number;
}

export function playerValueHistoryItemFromApiResponse(
	valueHistoryItem: any
): PlayerValueHistoryItem {
	return {
		day: new Date(valueHistoryItem.d),
		value: valueHistoryItem.m,
	};
}
