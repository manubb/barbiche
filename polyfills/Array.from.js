Array.from = Array.from || function(list) {
	return Array.prototype.slice.call(list);
};
