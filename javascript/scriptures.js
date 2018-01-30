/*==================================================
 * File:    scriptures.js
 * Author:  Matthew Christensen
 * Date:    Winter 2018

 * Description: Front-end code for the Scriptures, Mapped (Project 1)
*/

/*global window */
/*jslint browser: true */
/*property
    books, forEach, init, maxBookId, minBookId, onerror, onload, open, parse,
    push, responseText, send, status
*/

const scriptures = (function () {
    "use strict";

    let books = {};
    let volumes = [];

    function ajax(url, successCallback, failureCallback) {
        let request = new XMLHttpRequest();
        request.open("GET", url, true);

        request.onload = function () {
            if (request.status >= 200 && request.status < 400) {
                let data = JSON.parse(request.responseText);

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
    }

    function cacheBooks(callback) {
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
    }
    // function navigateHome() {
    //     let html = "<div>The Old Testament</div><div>The New Testament</div>";
    //     document.getElementByID("scriptures").innerHTM = html;
    // }

    /*==================================================
     *              PUBLIC API
     */
    const api = {
        init(callback) {
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
        }
        // function onHashChanged() {
        //     let ids = [];
        //     if (location.hash !== "" && location.hash.length > 1) {
        //         ids = location.hash.substring(1).split(':');
        //     }
        //     if (ids.length <= 0) {
        //         navigateHome();
        //     } else {
        //
        //     }
        // }
    };
    return api;
}());
