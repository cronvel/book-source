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



const StructuredDocument = require( './StructuredDocument.js' ) ;
const documentParts = require( './documentParts.js' ) ;



exports.autoId = ( structuredDocument , object , params , data ) => {
	if ( ! params.types.has( object.type ) ) { return ; }

	let text = StructuredDocument.getText( object ) ;
	let id = data.idPrefix + StructuredDocument.textToId( text ) ;

	if ( data.idList.has( id ) ) {
		let originalId = id ;
		let count = data.idList.get( originalId ) ;
		count ++ ;
		id = originalId + '_' + count ;

		while ( data.idList.has( id ) ) {
			count ++ ;
			id = originalId + '_' + count ;
		}

		data.idList.set( originalId , count ) ;
	}

	// Always add the current ID, even if originalId was added too
	data.idList.set( id , 1 ) ;

	object.id = id ;
} ;

const DEFAULT_AUTO_ID_TYPES = new Set( [ 'header' ] ) ;

exports.autoId.init = ( structuredDocument , params , data ) => {
	if ( Array.isArray( params.types ) ) { params.types = new Set( params.types ) ; }
	else if ( ! params.types || ! ( params.types instanceof Set ) ) { params.types = DEFAULT_AUTO_ID_TYPES ; }

	if ( data.idPrefix === undefined ) { data.idPrefix = params.idPrefix || '' ; }

	data.idList = new Map() ;
} ;



// TOC: Table of Contents
exports.toc = ( structuredDocument , object , params , data ) => {
	if ( object.type === 'special' ) {
		switch ( object.special ) {
			case 'toc' :
				data.tocObjects.push( object ) ;
				break ;
			case 'toc-start' :
				resetToc( data ) ;
				break ;
			case 'toc-end' :
				data.tocEnded = true ;
				break ;
		}

		return ;
	}

	if ( data.tocEnded || object.type !== 'header' || object.level > params.maxLevel ) { return ; }

	let item = new documentParts.ListItem( object.level - 1 ) ;
	let link = new documentParts.Link( '#' + object.id ) ;
	item.parts.push( link ) ;
	let text = new documentParts.Text( StructuredDocument.getText( object ) ) ;
	link.parts.push( text ) ;

	if ( ! data.tocHeaderLevelStack.length ) {
		data.tocHeaderLevelStack.push( object.level ) ;
	}

	let lastListLevel = data.tocHeaderLevelStack.length - 1 ;
	let lastHeaderLevel = data.tocHeaderLevelStack[ lastListLevel ] ;

	while ( object.level < lastHeaderLevel && lastListLevel > 0 ) {
		lastListLevel -- ;
		lastHeaderLevel = data.tocHeaderLevelStack[ lastListLevel ] ;
		data.tocHeaderLevelStack.length = data.tocListStack.length = lastListLevel + 1 ;
	}

	if ( object.level > lastHeaderLevel ) {
		let parentList = data.tocListStack[ lastListLevel ] ;
		let parentListItem = parentList.parts[ parentList.parts.length - 1 ] ;
		let currentList = new documentParts.List( object.level - 1 ) ;
		data.tocListStack.push( currentList ) ;
		data.tocHeaderLevelStack.push( object.level ) ;
		currentList.parts.push( item ) ;
		parentListItem.parts.push( currentList ) ;
	}
	else {
		// It's equal OR the doc is not well-formed and it's less, nevertheless, we just act as if it's equal
		let currentList = data.tocListStack[ lastListLevel ] ;
		currentList.parts.push( item ) ;
	}
} ;

exports.toc.init = ( structuredDocument , params , data ) => {
	params.maxLevel = params.maxLevel || Infinity ;
	data.tocObjects = [] ;
	resetToc( data ) ;
} ;

function resetToc( data ) {
	data.tocList = new documentParts.List( 0 ) ;
	data.tocListStack = [ data.tocList ] ;
	data.tocHeaderLevelStack = [] ;
	data.tocEnded = false ;
}

exports.toc.finalize = ( structuredDocument , params , data ) => {
	structuredDocument.toc = data.tocList ;

	for ( let tocObject of data.tocObjects ) {
		tocObject.parts.push( data.tocList ) ;
	}
} ;

exports.toc.require = [ 'autoId' ] ;

