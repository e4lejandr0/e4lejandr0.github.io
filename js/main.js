'use strict';
let data = {
    "bitches": {
        "content": "<p>Bitches on Wheels is my company. I found it on 2017 in the spurr of the moment. Our mission is to make sure that all bitches are able to afford the wheels they deserve.</p>",
        "imgSrc": "http://suzannevince.com/wp-content/uploads/2014/06/Bitch-on-Wheels-pic.jpg",
        "title": "Bitches on Wheels",
        "caption": "these are my bitches"
    },
    "bio": {
        "content": "<p>hello im rebekah and i dont really think, i like to eat fish and im a Scorpio.</p><br><p>i hate life and everything, except Edd cuz he's cool.</p>",
        "imgSrc": "https://pbs.twimg.com/profile_images/865840058397589504/SflUVPWi_400x400.jpg",
        "title": "im dumb",
        "caption": "she ain't even lookin that dumb(by Edd)"
    },
    "memes": {
        "content": "<p>memes coming soon</p>",
        "imgSrc": "https://usatftw.files.wordpress.com/2017/05/spongebob.jpg?w=600&h=600&crop=1",
        "title": "my favorite memes",
        "caption": "memes r my life"
    },
    "game": {
        "content": "<p>under construction, Edd hurry the fuck up</p>",
        "imgSrc": "http://www.safetysign.com/images/source/large-images/R5335.png",
        "title": "Rebekah The Game",
        "caption": "eventually i'll do this game"
    }
};
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded fired");
    let pageObject = {
            "mainText": document.querySelector('#text-content'),
            "mainImage": document.querySelector('#main-image'),
            "title": document.querySelector('#title'),
            "caption": document.querySelector('#caption')
    };
    let tabs = document.querySelectorAll('.tab');
    tabs.forEach((tab) => {
        tab.addEventListener("click", (event) => {
            console.log(event.target);
            let target = event.target.getAttribute('data-link-target');
            pageObject.mainText.innerHTML = data[target].content;
            pageObject.mainImage.src = data[target].imgSrc;
            pageObject.title.innerHTML = data[target].title;
            pageObject.caption.innerHTML = data[target].caption;
        });
    });
    tabs[0].click();
});
