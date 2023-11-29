/*
	Book Source

	Copyright (c) 2023 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



const Color = require( './Color.js' ) ;



function Theme( params = {} ) {
	this.colors = {
		tableBorder: '$brighter blue tone slightly dull' ,
		tableCaptionBackground: '$orange' ,
		tableCaptionText: '$white' ,
		tableColumnHead: '$ligther red' ,
		tableRowHead: '$brighter gray' ,
		tableBothHead: '$brighter gray' ,
		codeBackground: '$bright blue tint slightly dull' ,
		codeBorder: '$slightly bright blue tint' ,
	} ;

	this.palette = params.palette ;

	if ( this.palette ) { this.substituteWithPalette() ; }
}

module.exports = Theme ;



Theme.prototype.substituteWithPalette = function() {
	var property , value , colorObject ;
	
	for ( property in this.colors ) {
		value = this.colors[ property ] ;

		if ( value[ 0 ] === '$' ) {
			colorObject = Color.parse( value.slice( 1 ) ) ;
			if ( this.palette.has( colorObject ) ) {
				this.colors[ property ] = colorObject ;
			}
		}
	}
} ;

