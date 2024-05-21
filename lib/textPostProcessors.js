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



// Non-breaking space
const NBSP = String.fromCharCode( 0xa0 ) ;



const DOUBLE_GRAPH_PUNCTUATIONS = [ ':' , ';' , '!' , '?' ] ;
const FRENCH_TYPO_PUNCTUATION_REGEX = "[ " + NBSP + "]?([" + DOUBLE_GRAPH_PUNCTUATIONS.join( '' ) + "]+)" ;

exports.frenchTypoPunctuation = ( part , lastPart ) => {
	if ( lastPart ) {
		let lastChar = lastPart.text[ lastPart.text.length - 1 ] ;
		if (
			lastChar !== NBSP
			&& ! DOUBLE_GRAPH_PUNCTUATIONS.includes( lastChar )
			&& part.text.match( /^[:;!?]/ )
		) {
			if ( lastChar === ' ' ) {
				lastPart.text = lastPart.text.slice( 0 , -1 ) + NBSP ;
			}
			else {
				part.text = NBSP + part.text ;
			}
		}
	}

	part.text.replace( new RegExp( FRENCH_TYPO_PUNCTUATION_REGEX , 'g' ) , ( match , punctuations ) => NBSP + punctuations ) ;
} ;

