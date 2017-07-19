"use strict";
RoomVisual.prototype.drawCross = function(x, y, style) {
    this.line(x-0.5, y, x+0.5, y, style);
    this.line(x, y-0.5, x, y+0.5, style);
}