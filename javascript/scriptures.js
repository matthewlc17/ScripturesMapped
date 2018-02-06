/*==================================================
 * File:    scriptures.js
 * Author:  Matthew Christensen
 * Date:    Winter 2018

 * Description: Front-end code for the Scriptures, Mapped (Project 1)
*/

/*global window */
/*jslint browser: true */
/*property
    books, forEach, getElementById, hash, id, init, innerHTML, length,
    maxBookId, minBookId, numChapters, onHashChanged, onerror, onload, open,
    parse, push, responseText, send, split, status, substring, console, log,
    titleForBookChapter, setupMarkers, addMarker, clearMarkers
*/

const scriptures = (function () {
    "use strict";

    /*====================================================================
     *              CONSTANTS
     */
     const LAT_LON_PARSER = /\((.*),'(.*)',(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*)\)/;
     const SCRIPTURES_URL = "http://scriptures.byu.edu/mapscrip/mapgetscrip.php";
     const MAX_RETRY_DELAY = 5000;
     //AIzaSyDuPLtrF4MskjIwthQz0jITvbY3gt3kOH0
    /*====================================================================
     *              PRIVATE VARIABLES
     */
    let books = {};
    let volumes = [];
    let gmMarkers = [];
    let gmLabels = [];
    let retryDelay = 500;
    /*====================================================================
     *              PRIVATE METHOD DECLARATIONS
     */
    let ajax;
    let cacheBooks;
    let init;
    let onHashChanged;
    let navigateHome;
    let navigateBook;
    let navigateChapter;
    let bookChapterValid;
    let encodedScriptureURLParameters;
    let getScriptureCallback;
    let getScriptureFailed;
    let nextChapter;
    let previousChapter;
    let titleForBookChapter;
    let setupMarkers;
    let addMarker;
    let clearMarkers;
    let showLocation;
    let nextChapterHash;
    let previousChapterHash;
    /*==================================================================
     *              PRIVATE METHODS
     */

    ajax = function (url, successCallback, failureCallback, skipParse) {
        let request = new XMLHttpRequest();
        request.open("GET", url, true);

        request.onload = function () {
            if (request.status >= 200 && request.status < 400) {
                let data;
                if (skipParse) {
                    data = request.responseText;
                } else {
                    data = JSON.parse(request.responseText);
                }
                if (typeof successCallback === "function") {
                    successCallback(data);
                }
            } else {
                if (typeof failureCallback === "function") {
                    failureCallback(request);
                }
            }
        };
        request.onerror = failureCallback;
        request.send();
    };

    cacheBooks = function (callback) {
        volumes.forEach(function (volume) {
            let volumeBooks = [];
            let bookId = volume.minBookId;

            while (bookId <= volume.maxBookId) {
                volumeBooks.push(books[bookId]);
                bookId += 1;
            }
            volume.books = volumeBooks;
        });
        if (typeof callback === "function") {
            callback();
        }
    };

    encodedScriptureURLParameters = function (bookId, chapter, verses, isJst) {
        let options = "";

        if (bookId !== undefined && chapter !== undefined) {
            if (verses !== undefined) {
                options += verses;
            }
            if (isJst !== undefined && isJst) {
                options += "&jst=JST";
            }
            return SCRIPTURES_URL + "?book=" + bookId + "&chap=" + chapter + "&verses=" + options;
        }
    };
    getScriptureCallback = function (chapterHtml) {
        //potentially check if this is data we want to display to the user
        document.getElementById("scriptures").innerHTML = "<button onclick=\"scriptures.navigateHome()\">Home</button>" + chapterHtml + "<div style=\"text-align:center;\"><button id=\"previousbtn\">Previous</button><button id=\"nextbtn\">Next</button></div>";
        setupMarkers();
        //define onclick methods for previous/next buttons
        document.getElementById("previousbtn").onclick = function() {location.hash = previousChapterHash;}
        document.getElementById("nextbtn").onclick = function() {location.hash = nextChapterHash;}
    };
    getScriptureFailed = function () {
        console.log("warning: scripture request from server failed.");
    };
    init = function (callback) {
        let booksLoaded = false;
        let volumesLoaded = false;

        ajax(
            "http://scriptures.byu.edu/mapscrip/model/books.php",
            function (data) {
                books = data;
                booksLoaded = true;

                if (volumesLoaded) {
                    cacheBooks(callback);
                }
            }
        );
        ajax(
            "http://scriptures.byu.edu/mapscrip/model/volumes.php",
            function (data) {
                volumes = data;
                volumesLoaded = true;

                if (booksLoaded) {
                    cacheBooks(callback);
                }
            }
        );
    };

    nextChapter = function (bookId, chapter) {
        let book = books[bookId];
        if (book !== undefined) {
            if (chapter < book.numChapters) {
                return [bookId, chapter + 1, titleForBookChapter(book, chapter)];
            }
            let nextbook = books[bookId + 1];

            if (nextbook !== undefined) {
                let nextChapterValue = 0;
                if (nextbook.numChapters > 0) {
                    nextChapterValue = 1;
                }
                return [nextbook.id, nextChapterValue, titleForBookChapter(nextbook, nextChapterValue)];
            }
        }
    };

    previousChapter = function (bookId, chapter) {
        let book = books[bookId];
        if (book !== undefined) {
            if (chapter > 1) {
                return [bookId, chapter - 1, titleForBookChapter(book, chapter)];
            }
            let previousbook = books[bookId - 1];

            if (previousbook !== undefined) {
                let previousChapterValue = 0;
                if (previousbook.numChapters > 0) {
                    previousChapterValue = previousbook.numChapters;
                }
                return [previousbook.id, previousChapterValue, titleForBookChapter(previousbook, previousChapterValue)];
            }
        }
    };

    titleForBookChapter = function (book, chapter) {
        return book.tocName + (chapter > 0 ? " " + chapter : "");
    };
    onHashChanged = function () {
        let ids = [];
        let volumeId;
        let bookId;
        let chapter;
        if (location.hash !== "" && location.hash.length > 1) {
            //remove leading pound sign and split string on colon delimeters
            ids = location.hash.substring(1).split(":");
        }
        if (ids.length <= 0) {
            navigateHome();
        } else if (ids.length === 1) {
            //display single volume's table of contents
            volumeId = Number(ids[0]);

            if (volumeId < volumes[0].id || volumeId > volumes[volumes.length - 1].id) {
                navigateHome();
            } else {
                navigateHome(volumeId);
            }
        } else if (ids.length === 2) {
            //display book's list of chapters
            bookId = Number(ids[1]);
            if (books[bookId] === "undefined") {
                navigateHome();
            } else {
                navigateBook(bookId);
            }
        } else {
            //display chapter contents
            bookId = Number(ids[1]);
            chapter = Number(ids[2]);

            if (!bookChapterValid(bookId, chapter)) {
                navigateHome();
            } else {
                navigateChapter(bookId, chapter);
            }
        }
    };

    navigateHome = function (volumeId) {
        location.hash = "";
        let navContents = "<div id=\"scripnav\">";
        volumes.forEach(function (volume) {
            if (volumeId === undefined || volume.id === volumeId) {
                navContents += "<div class=\"volume\"<a name=\"v" + volume.id + "\" /><h5>" + volume.fullName + "</h5></div><div class=\"books\">";

                volume.books.forEach(function (book) {
                    navContents += "<a class=\"btn\" id=\"" + book.id + "\" href=\"#" + volume.id + ":" + book.id + "\">" + book.gridName + "</a>";
                });
                navContents += "</div>";
            }
        });

        navContents += "<br /><br /></div>";
        document.getElementById("scriptures").innerHTML = navContents;
    };

    navigateBook = function (bookId) {
        let book = books[bookId];
        let volume = volumes[book.parentBookId];
        let navContents = "<div id=\"scripnav\"><h1>" + volume.fullName + "</h1><div class=\"volume\"<a name=\"v" + book.id + "\" /><h5>" + book.fullName + "</h5></div><div class=\"books\">";
        for (let i = 1; i < book.numChapters; i++) {
            navContents += "<a class=\"btn\" id=\"" + i + "\" href=\"#" + book.parentBookid + ":" + book.id + ":" + i + "\">" + "Chapter " + i + "</a> ";
        }
        navContents += "</div></div>"
        document.getElementById("scriptures").innerHTML = navContents;
    };

    navigateChapter = function (bookId, chapter) {
        if (bookId !== undefined) {
            let book = books[bookId];
            let volume = volumes[book.parentBookId - 1];
            let nextChapterArray = nextChapter(bookId, chapter);
            let previousChapterArray = previousChapter(bookId, chapter);
            //GREATE PLACE TO IMPLEMENT NEXT/PREIVIOUS

            previousChapterHash = "1:" + previousChapterArray[0] + ":" + previousChapterArray[1];
            nextChapterHash = "1:" + nextChapterArray[0] + ":" + nextChapterArray[1];

            ajax(encodedScriptureURLParameters(bookId, chapter), getScriptureCallback, getScriptureFailed, true);
        }
        // document.getElementById("scriptures").innerHTML = "<div>Book ID: " + bookId + ", Chapter: " + chapter + "</div>";
        // let book = books[bookId];
        // console.log(book)
    };

    bookChapterValid = function (bookId, chapter) {
        let book = books[bookId];

        if (book === undefined || chapter < 0 || chapter > book.numChapters) {
            return false;
        }
        if (chapter === 0 && book.numChapters > 0) {
            return false;
        }
        return true;
    };
    setupMarkers = function () {
        if (window.google === undefined) {
            let retryId = window.setTimeout(setupMarkers, retryDelay);

            retryDelay += retryDelay;

            if (retryDelay > MAX_RETRY_DELAY) {
                window.clearTimeout(retryId);
            }
            return;
        }
        if (gmMarkers.length > 0) {
            clearMarkers();
        }
        let matches;

        document.querySelectorAll("a[onclick^=\"showLocation(\"]").forEach(function (element) {
            let value = element.getAttribute("onclick");

            matches = LAT_LON_PARSER.exec(value);

            if (matches) {
                let placename = matches[2];
                let latitude = Number(matches[3]);
                let longitude = Number(matches[4]);
                let flag = matches[11].substring(1);
                flag = flag.substring(0, flag.length - 1);
                if (flag !== "") {
                    placename += " " + flag;
                }
                addMarker(placename, latitude, longitude);
            }
        });
        //Automatically expand map to show all markers if there are more than one
        if (gmMarkers.length > 1) {
            let latlng = [];
            gmMarkers.forEach(function (marker) {
                 latlng.push(new google.maps.LatLng(marker.position.lat(), marker.position.lng()));
            });
            let latlngbounds = new google.maps.LatLngBounds();
            latlng.forEach(function (myLatLng) {
                latlngbounds.extend(myLatLng);
            });
            map.fitBounds(latlngbounds);
        }
    };

    addMarker = function (placename, latitude, longitude) {
        let marker = new google.maps.Marker({
            position: {lat: latitude, lng: longitude},
            map: map,
            title: placename,
            animation: google.maps.Animation.DROP
        });
        let mapLabel = new MapLabel({
            text: 'Test',
            position: new google.maps.LatLng(34.03, -118.235),
            map: map,
            fontSize: 35,
            align: 'right'
        });
        mapLabel.set('position', new google.maps.LatLng(34.03, -118.235));

        let marker2 = new google.maps.Marker();
        marker2.bindTo('map', mapLabel);
        marker2.bindTo('position', mapLabel);
        marker2.setDraggable(true);


        gmMarkers.push(marker);
    };
    clearMarkers = function () {
        gmMarkers.forEach(function (marker) {
             marker.setMap(null);
        });
        gmMarkers = [];
    };
    showLocation = function (geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading) {
        clearMarkers();
        addMarker(placename, latitude, longitude);
        console.log(viewAltitude);
    }

    /*==================================================
     *              PUBLIC API
     */
    return {
        init(callback) {
            init(callback);
        },
        onHashChanged() {
            onHashChanged();
        },
        showLocation(geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading) {
            showLocation(geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading);
        },
        navigateHome() {
            navigateHome();
        }
    };
}());
