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



const bookSource = {} ;
module.exports = bookSource ;

bookSource.StructuredDocument = require( './StructuredDocument.js' ) ;
bookSource.Style = require( './Style.js' ) ;
bookSource.Color = require( './Color.js' ) ;

bookSource.Palette = require( './Palette.js' ) ;
bookSource.Theme = require( './Theme.js' ) ;
bookSource.HtmlRenderer = require( './HtmlRenderer.js' ) ;

bookSource.parse = bookSource.StructuredDocument.parse ;



const path = require( 'path' ) ;

bookSource.getBuiltinCssPath = type => {
	switch ( type ) {
		case 'core' :
		case 'standalone' :
		case 'code' :
			return path.join( __dirname , '..' , 'css' , type + '.css' ) ;
	}

	throw new Error( "There is no built-in CSS of type '" + type + "'" ) ;
} ;

bookSource.getBuiltinCssSync = type => {
	const fs = require( 'fs' ) ;
	return fs.readFileSync( bookSource.getBuiltinCssPath( type ) , 'utf8' ) ;
} ;

bookSource.getBuiltinCss = type => {
	const fs = require( 'fs' ) ;
	return fs.promises.readFile( bookSource.getBuiltinCssPath( type ) , 'utf8' ) ;
} ;

