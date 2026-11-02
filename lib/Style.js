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



const Color = require( 'palette-shade' ).Color ;



function Style() {
	this.textColor = null ;
	this.backgroundColor = null ;
	this.bold = null ;
	this.italic = null ;
	this.underline = null ;
	this.width = null ;
	this.fx = null ;
}

module.exports = Style ;



Style.prototype.merge = function( ... styles ) {
	return Style.merge( this , ... styles ) ;
} ;



Style.merge = function( ... styles ) {
	var mergedStyle = new Style() ;

	for ( let style of styles ) {
		if ( style.textColor !== null ) { mergedStyle.textColor = style.textColor ; }
		if ( style.backgroundColor !== null ) { mergedStyle.backgroundColor = style.backgroundColor ; }
		if ( style.bold !== null ) { mergedStyle.bold = style.bold ; }
		if ( style.italic !== null ) { mergedStyle.italic = style.italic ; }
		if ( style.underline !== null ) { mergedStyle.underline = style.underline ; }
		if ( style.width !== null ) { mergedStyle.width = style.width ; }
		if ( style.fx !== null ) { mergedStyle.fx = style.fx ; }
	}

	return mergedStyle ;
} ;



const BOOLEAN_PROPERTIES = new Set( [ 'bold' , 'italic' , 'underline' ] ) ;
const TEXT_COLOR_PROPERTIES = new Set( [ 'text' , 'tx' , 'foreground' , 'fg' ] ) ;
const BACKGROUND_COLOR_PROPERTIES = new Set( [ 'background' , 'bg' ] ) ;
const WIDTH_PROPERTIES = new Set( [ 'width' , 'w' ] ) ;		// or a value ending with %
const FX_PROPERTIES = new Set( [ 'fx' ] ) ;



Style.parse = function( str , forTextElement = true ) {
	var style = new Style() ;

	for ( let part of str.trim().split( /,/g ) ) {
		let [ property , value ] = part.split( ':' ) ;

		if ( value ) {
			property =
				TEXT_COLOR_PROPERTIES.has( property ) ? 'text' :
				BACKGROUND_COLOR_PROPERTIES.has( property ) ? 'background' :
				WIDTH_PROPERTIES.has( property ) ? 'width' :
				FX_PROPERTIES.has( property ) ? 'fx' :
				forTextElement ? 'text' :
				'background' ;
		}
		else {
			if ( BOOLEAN_PROPERTIES.has( property ) ) {
				style[ property ] = true ;
				continue ;
			}
			else if ( property[ property.length - 1 ] === '%' ) {
				value = property ;
				property = 'width' ;
			}
			else {
				value = property ;
				property = forTextElement ? 'text' : 'background' ;
			}
		}

		switch ( property ) {
			case 'text' :
				style.textColor = Color.parse( value ) ;
				break ;
			case 'background' :
				style.backgroundColor = Color.parse( value ) ;
				break ;
			case 'width' :
				if ( value[ value.length - 1 ] !== '%' ) { value += '%' ; }
				style.width = value ;
				break ;
			case 'fx' :
				style.fx = value ;
				break ;
		}
	}

	return style ;
} ;

