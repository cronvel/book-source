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
		background: '$white' ,

		text: '$black' ,
		linkText: '$blue' ,
		hoverLinkText: '$bright blue' ,
		
		headerRule: '$brighter gray' ,

		//quoteBackground: '$lighter blue tint' ,
		quoteBackground: '$brighter blue dullest tone' ,
		quote2Background: '$bright blue dullest tone' ,	// quote in quote

		codeBackground: '$bright blue tint slightly dull' ,
		codeBorder: '$slightly bright blue tint' ,
		
		figureCaptionBackground: '$brightest blue dull tone' ,

		tableRowBackground: '$white' ,
		tableEvenRowBackground: '$lightest blue tint' ,
		tableBorder: '$brighter blue tone slightly dull' ,
		tableCaptionBackground: '$orange' ,
		tableCaptionText: '$white' ,
		tableColumnHead: '$lightest red' ,
		tableRowHead: '$lightest green' ,
		tableBothHead: '$brighter gray' ,
	} ;

	this.sizes = {
		text: '14px' ,
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

