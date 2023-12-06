#!/usr/bin/env node
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



const StructuredText = require( '../lib/StructuredText.js' ) ;

const fs = require( 'fs' ) ;
const path = require( 'path' ) ;


const filepath = process.argv[ 2 ] ;

if ( ! filepath ) {
	console.error( "Usage is: ./" + path.basename( process.argv[ 1 ] ) + " <source-text>" ) ;
	process.exit( 1 ) ;
}



var content = '' ;

try {
	content = fs.readFileSync( filepath , 'utf8' ) ;
}
catch ( error ) {
	console.error( "Error reading file '" + filepath + "':" , error ) ;
	process.exit( 1 ) ;
}

var standaloneCss = fs.readFileSync( path.join( __dirname , '../css/standalone.css' ) , 'utf8' ) ;
var css = fs.readFileSync( path.join( __dirname , '../css/book-source.css' ) , 'utf8' ) ;
var codeCss = fs.readFileSync( path.join( __dirname , '../css/highlight.css' ) , 'utf8' ) ;

var structuredText = StructuredText.parse( content ) ;
const string = require( 'string-kit' ) ;
const inspectOptions = { style: 'color' , depth: 10 , outputMaxLength: 100000 } ;
console.error( "\nStructuredText parts:" , string.inspect( inspectOptions , structuredText.parts ) ) ;

var html = structuredText.toHtml( {
		//palette: { blue: '#bbaa00' } ,
		colors: { linkText: '$teal' , hoverLinkText: '$orange' , visitedLinkText: '$red' } ,
		sizes: { text: '18px' } ,
		//fonts: { main: 'monospace' } ,
	} ,
	{ standalone: true , standaloneCss , css , codeCss }
) ;

console.error( "\nHTML:" ) ;
console.log( html ) ;



