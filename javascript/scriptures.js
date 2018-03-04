/*==================================================
 * File:    scriptures.js
 * Author:  Matthew Christensen
 * Date:    Winter 2018

 * Description: Front-end code for the Scriptures, Mapped (Project 1)
*/

/*global window */
/*jslint browser: true */
/*property
    Animation, DROP, LatLng, LatLngBounds, Marker, animation, books,
    clearTimeout, exec, extend, fitBounds, floor, forEach, fullName,
    getAttribute, getElementById, google, gridName, hash, id, init, innerHTML,
    label, lat, length, lng, log, map, maps, maxBookId, minBookId, numChapters,
    onHashChanged, onclick, onerror, onload, open, panTo, parentBookId, parse,
    position, push, querySelectorAll, responseText, send, setCenter, setMap,
    setTimeout, setZoom, showLocation, split, status, substring, title,
    tocName
*/


const scriptures = (function () {
    "use strict";

    /*====================================================================
     *              CONSTANTS
     */
     const LAT_LON_PARSER = /\((.*),'(.*)',(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*),(.*)\)/;
     const SCRIPTURES_URL = "http://scriptures.byu.edu/mapscrip/mapgetscrip.php";
     const MAX_RETRY_DELAY = 5000;
     const JURUSALEM_LAT_LNG = {lat: 31.7683, lng: 35.2137};
    /*====================================================================
     *              PRIVATE VARIABLES
     */
    let books = {};
    let volumes = [];
    let gmMarkers = [];
    let requestedBreaadcrumbs;
    let retryDelay = 500;
    /*====================================================================
     *              PRIVATE METHOD DECLARATIONS
     */
    let addMarker;
    let ajax;
    let bookChapterValid;
    let breadcrumbs;
    let cacheBooks;
    let clearMarkers;
    let currChapterHTML;
    let encodedScriptureURLParameters;
    let getScriptureCallback;
    let getScriptureFailed;
    let hash;
    let init;
    let navigateBook;
    let navigateChapter;
    let navigateHome;
    let nextChapter;
    let nextChapterHash;
    let nextChapterHTML;
    let onHashChanged;
    let previousChapter;
    let previousChapterHash;
    let previousChapterHTML;
    let recenterMap;
    let setupMarkers;
    let showLocation;
    let titleForBookChapter;
    /*==================================================================
     *              PRIVATE METHODS
     */

    addMarker = function (placename, latitude, longitude) {
        let marker = new google.maps.Marker({
            position: {lat: latitude, lng: longitude},
            map: map,
            title: placename,
            label: placename,
            animation: google.maps.Animation.DROP
        });
        gmMarkers.push(marker);
    };

    ajax = function (url, successCallback, failureCallback, skipParse) {
        if (successCallback !== null) {
            $.ajax({
                url: url,
                success: successCallback,
                error: failureCallback
            })
        } else {
            let successCallback2 = function (nextdata) {
                nextChapterHTML = nextdata;
                let ids2 = previousChapterHash.substring(1).split(":");
                let bookId2 = ids2[1];
                let chapter2 = ids2[2];
                $.ajax({
                    url: encodedScriptureURLParameters(bookId2, chapter2),
                    success: getScriptureCallback,
                    error: failureCallback
                })
            }
            successCallback = function (currdata) {
                currChapterHTML = currdata;
                let ids = nextChapterHash.substring(1).split(":");
                let bookId = ids[1];
                let chapter = ids[2];
                $.ajax({
                    url: encodedScriptureURLParameters(bookId, chapter),
                    success: successCallback2,
                    error: failureCallback
                })
            }
            $.ajax({
                url: url,
                success: successCallback,
                error: failureCallback
            })
        }

        // let request = new XMLHttpRequest();
        // request.open("GET", url, true);
        //
        // request.onload = function () {
        //     if (request.status >= 200 && request.status < 400) {
        //         let data;
        //         if (skipParse) {
        //             data = request.responseText;
        //         } else {
        //             data = JSON.parse(request.responseText);
        //         }
        //         if (typeof successCallback === "function") {
        //             successCallback(data);
        //         }
        //     } else {
        //         if (typeof failureCallback === "function") {
        //             failureCallback(request);
        //         }
        //     }
        // };
        // request.onerror = failureCallback;
        // request.send();
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

    breadcrumbs = function (volume, book, chapter) {
        let crumbs;

        if (volume === undefined) {
            crumbs = "<ul><li>The Scriptures</li>";
        } else {
            crumbs = "<ul><li><a href=\"javascript:void(0);\" onclick=\"scriptures.hash()\">The Scriptures</a></li>";

            if (book === undefined) {
                crumbs += "<li>" + volume.fullName + "</li>";
            } else {
                crumbs += "<li><a href=\"javascript:void(0);\" onclick=\"scriptures.hash(" + volume.id + ")\">" + volume.fullName + "</a></li>";

                if (chapter === undefined || chapter <= 0) {
                    crumbs += "<li>" + book.tocName + "</li>";
                } else {
                    crumbs += "<li><a href=\"javascript:void(0);\" onclick=\"scriptures.hash(" + volume.id + "," + book.id + ")\">" + book.tocName + "</a></li>";
                    crumbs += "<li>" + chapter + "</li>";
                }
            }
        }

        return crumbs + "</ul>";
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

    clearMarkers = function () {
        gmMarkers.forEach(function (marker) {
            marker.setMap(null);
        });
        gmMarkers = [];
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
        previousChapterHTML = chapterHtml;
        if (previousChapterHash !== undefined && nextChapterHash !== undefined) {
            // $("#navchapter").html("<div style=\"text-align:center;\"><button id=\"previousbtn\">Previous</button><button id=\"nextbtn\">Next</button></div>");
            currChapterHTML = "<div style=\"text-align:center;\"><button id=\"previousbtn\">previous</button><button id=\"nextbtn\">next</button></div>" + currChapterHTML;
            if ($("#scrip1").hasClass("activescrip")) {
                $("#scrip1").html(currChapterHTML);
                $("#scrip2").html(nextChapterHTML);
            } else {
                $("#scrip2").html(currChapterHTML);
                $("#scrip1").html(nextChapterHTML);
            }
            document.getElementById("previousbtn").onclick = function () {
                if ($("#scrip1").hasClass("activescrip")) {
                    $("#scrip2").attr("style","left: -100%");
                    $("#scrip2").html(previousChapterHTML);
                    $("#scrip1").animate({ left: "100%" }, 1000, function () {
                        $("#scrip1").attr("style","left: -100%");
                        location.hash = previousChapterHash;
                    });
                    $("#scrip2").animate({ left: 0 }, 1000);
                    $("#scrip1").removeClass("activescrip");
                    $("#scrip2").addClass("activescrip");
                } else {
                    $("#scrip1").attr("style","left: -100%");
                    $("#scrip1").html(previousChapterHTML);
                    $("#scrip2").animate({ left: "100%" }, 1000, function () {
                        $("#scrip2").attr("style","left: -100%");
                        location.hash = previousChapterHash;
                    });
                    $("#scrip1").animate({ left: 0 }, 1000);
                    $("#scrip2").removeClass("activescrip");
                    $("#scrip1").addClass("activescrip");
                }
            };
            document.getElementById("nextbtn").onclick = function () {
                if ($("#scrip1").hasClass("activescrip")) {
                    $("#scrip2").attr("style","left: 100%");
                    $("#scrip1").animate({ left: "-100%" }, 1000, function () {
                        $("#scrip1").attr("style","left: 100%");
                        location.hash = nextChapterHash;
                    });
                    $("#scrip2").animate({ left: 0 }, 1000);
                    $("#scrip1").removeClass("activescrip");
                    $("#scrip2").addClass("activescrip");
                } else {
                    $("#scrip1").attr("style","left: 100%");
                    $("#scrip2").animate({ left: "-100%" }, 1000, function () {
                        $("#scrip2").attr("style","left: 100%");
                        location.hash = nextChapterHash;
                    });
                    $("#scrip1").animate({ left: 0 }, 1000);
                    $("#scrip2").removeClass("activescrip");
                    $("#scrip1").addClass("activescrip");
                }
            };
        } else if (previousChapterHash !== undefined && nextChapterHash === undefined) {
            document.getElementById("scriptures").innerHTML = chapterHtml + "<div style=\"text-align:center;\"><button id=\"previousbtn\">Previous</button></div>";
            document.getElementById("previousbtn").onclick = function () {location.hash = previousChapterHash;};
        } else if (previousChapterHash === undefined && nextChapterHash !== undefined) {
            document.getElementById("scriptures").innerHTML = chapterHtml + "<div style=\"text-align:center;\"><button id=\"nextbtn\">Next</button></div>";
            document.getElementById("nextbtn").onclick = function () {location.hash = nextChapterHash;};
        } else {
            navigateHome();
        }
        document.getElementById("crumb").innerHTML = requestedBreaadcrumbs;
        setupMarkers();
    };

    getScriptureFailed = function () {
        console.log("warning: scripture request from server failed.");
    };

    hash = function (volumeId, bookId, chapter) {
        let newHash = "";

        if (volumeId !== undefined) {
            newHash += volumeId;
            if (bookId !== undefined) {
                newHash += ":" + bookId;
            }
            if (chapter !== undefined) {
                newHash += ":" + chapter;
            }
        }
        location.hash = newHash;
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

    navigateBook = function (bookId) {
        let book = books[bookId];
        let volume = volumes[book.parentBookId - 1];
        let navContents = "<div id=\"scripnav\"><h1>" + volume.fullName + "</h1><div class=\"volume\"<a name=\"v" + book.id + "\" /><h3>" + book.fullName + "</h5></div><div class=\"books\">";
        // for (let i = 1; i < book.numChapters; i++) {
        let i = 1;
        while (i <= book.numChapters) {
            navContents += "<a class=\"btn\" id=\"" + i + "\" href=\"#" + book.parentBookId + ":" + book.id + ":" + i + "\">" + "Chapter " + i + "</a> ";
            i += 1;
        }
        navContents += "</div></div>";
        if ($("#scrip1").hasClass("activescrip")) {
            // $("#scrip1").fadeIn({ queue: true });
            document.getElementById("scrip1").innerHTML = navContents;
        } else {
            document.getElementById("scrip2").innerHTML = navContents;
        }
        document.getElementById("crumb").innerHTML = breadcrumbs(volume, book);
        clearMarkers();
        recenterMap();
    };

    navigateChapter = function (bookId, chapter) {
        if (bookId !== undefined) {
            let book = books[bookId];
            let volume = volumes[book.parentBookId - 1];
            let nextChapterArray = nextChapter(bookId, chapter);
            let previousChapterArray = previousChapter(bookId, chapter);
            //GREATE PLACE TO IMPLEMENT NEXT/PREIVIOUS

            if (previousChapterArray !== undefined) {
                previousChapterHash = previousChapterArray[0].parentBookId + ":" + previousChapterArray[0].id + ":" + previousChapterArray[1];
            } else {
                previousChapterHash = undefined;
            }
            if (nextChapterArray !== undefined) {
                nextChapterHash = nextChapterArray[0].parentBookId + ":" + nextChapterArray[0].id + ":" + nextChapterArray[1];
            } else {
                nextChapterHash = undefined;
            }

            requestedBreaadcrumbs = breadcrumbs(volume, book, chapter);

            ajax(encodedScriptureURLParameters(bookId, chapter), null, getScriptureFailed, true);
        }
    };

    navigateHome = function (volumeId) {
        // let navContents = "<div id=\"scripnav\">";
        let navContents = '<div id="scripnav"><div id="accordion" role="tablist" aria-multiselectable="true">'
        let displayedVolume;
        volumes.forEach(function (volume) {
            if (volumeId === undefined || volume.id === volumeId) {
                // navContents += "<div class=\"volume\"<a name=\"v" + volume.id + "\" /><h5>" + volume.fullName + "</h5></div><div class=\"books\">";
                if (volume.id === volumeId) {
                    displayedVolume = volume;
                    navContents = "<div id=\"scripnav\"><div class=\"volume\"<a name=\"v" + volume.id + "\" /><h3>" + volume.fullName + "</h5></div><div class=\"books\">";
                } else {
                    navContents += '<div class="card"><div class="card-header" role="tab" id="heading' + volume.id + '"><h3 class="mb-0"><a class="collapsed" data-toggle="collapse" data-parent="#accordion" href="#collapse' + volume.id + '" aria-expanded="false" aria-controls="collapse' + volume.id + '">' + volume.fullName + '</a></h5></div><div id="collapse' + volume.id + '" class="collapse" role="tabpanel" aria-labelledby="heading' + volume.id + '"><div class="card-block"><div class="books">'
                }
                volume.books.forEach(function (book) {
                    if (book.numChapters === 0) {
                        navContents += "<a class=\"btn\" id=\"" + book.id + "\" href=\"#" + volume.id + ":" + book.id + ":0" + "\">" + book.gridName + "</a>";
                    } else {
                        navContents += "<a class=\"btn\" id=\"" + book.id + "\" href=\"#" + volume.id + ":" + book.id + "\">" + book.gridName + "</a>";
                        // navContents += '<li>'
                    }
                });
                // navContents += "</div>";
                navContents += '</div></div></div></div>'


            }
        });
        navContents += "<br /><br /></div></div>";
        if ($("#scrip1").hasClass("activescrip")) {
            // $("#scrip1").fadeIn({ queue: true });
            document.getElementById("scrip1").innerHTML = navContents;
        } else {
            document.getElementById("scrip2").innerHTML = navContents;
        }
        document.getElementById("crumb").innerHTML = breadcrumbs(displayedVolume);
        clearMarkers();
        recenterMap();
    };

    nextChapter = function (bookId, chapter) {
        let book = books[bookId];
        if (book !== undefined) {
            if (chapter < book.numChapters) {
                return [book, chapter + 1, titleForBookChapter(book, chapter)];
            }
            let nextbook = books[bookId + 1];

            if (nextbook !== undefined) {
                let nextChapterValue = 0;
                if (nextbook.numChapters > 0) {
                    nextChapterValue = 1;
                }
                return [nextbook, nextChapterValue, titleForBookChapter(nextbook, nextChapterValue)];
            }
        }
    };

    onHashChanged = function () {
        $("#scrip1").fadeIn(500);
        $("#scrip2").fadeIn(500);
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

    previousChapter = function (bookId, chapter) {
        let book = books[bookId];
        if (book !== undefined) {
            if (chapter > 1) {
                return [book, chapter - 1, titleForBookChapter(book, chapter)];
            }
            let previousbook = books[bookId - 1];

            if (previousbook !== undefined) {
                let previousChapterValue = 0;
                if (previousbook.numChapters > 0) {
                    previousChapterValue = previousbook.numChapters;
                }
                return [previousbook, previousChapterValue, titleForBookChapter(previousbook, previousChapterValue)];
            }
        }
    };

    recenterMap = function () {
        map.setCenter(JURUSALEM_LAT_LNG);
        map.setZoom(7);
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

        let myelements
        if ($("#scrip1").hasClass("activescrip")) {
            myelements = document.getElementById("scrip1").querySelectorAll("a[onclick^=\"showLocation(\"]");
        } else {
            myelements = document.getElementById("scrip2").querySelectorAll("a[onclick^=\"showLocation(\"]");
        }
        myelements.forEach(function (element) {
            let value = element.getAttribute("onclick");

            matches = LAT_LON_PARSER.exec(value);

            if (matches) {
                let placename = matches[2];
                let latitude = Number(matches[3]);
                let longitude = Number(matches[4]);
                //========== I HAVE ELECTED TO NOT USE FLAGS ================//
                // let flag = matches[11].substring(1);
                // flag = flag.substring(0, flag.length - 1);
                // if (flag !== "") {
                //     placename += " " + flag;
                // }
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
        } else if (gmMarkers.length === 1) {
            map.setZoom(11);
            map.panTo(gmMarkers[0].position);
        } else {
            map.setZoom(11);
            map.panTo(JURUSALEM_LAT_LNG);
        }
    };

    showLocation = function (geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading) {
        clearMarkers();
        addMarker(placename, latitude, longitude);
        map.setZoom(Math.floor(16 - (viewAltitude / 1000)));
        map.panTo(gmMarkers[0].position);
    };

    titleForBookChapter = function (book, chapter) {
        return book.tocName + (chapter > 0 ? " " + chapter : "");
    };

    /*==================================================
     *              PUBLIC API
     */
    return {
        init : init,
        onHashChanged : onHashChanged,
        hash : hash,
        showLocation(geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading) {
            showLocation(geotagId, placename, latitude, longitude, viewLatitude, viewLongitude, viewTilt, viewRoll, viewAltitude, viewHeading);
        },
        nextChapterHash: nextChapterHash
    };
}());
