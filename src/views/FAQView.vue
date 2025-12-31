<script setup lang="ts">
import { ref } from 'vue';

import PageHeader from '@/components/layout/PageHeader.vue';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What shows are happening in Portland tonight?',
    answer:
      'Glad you asked. Head to the Playlists page and select "NearHear Portland Tonight" to see a list of all the bands playing in Portland tonight along with a link to a Spotify playlist of all those bands.',
  },
  {
    question: 'What shows are happening in Portland this week?',
    answer:
      'NearHear has a Playlist containing all of the bands playing in Portland this week along with a links to more information and tickets.',
  },
  {
    question: 'What is NearHear?',
    answer:
      "NearHear is a live music discovery website based in Portland Oregon. We create pre-built and custom playlists so you can listen to bands with upcoming shows near you. Your local music scene is much more vibrant than most people realize, get to know the bands and venues you're missing out on.",
  },
  {
    question: 'How does NearHear work?',
    answer:
      "Hear it, Like it, See it. In other words, listen to a playlist until you hear something you like, then go to NearHear.app, select that playlist and click the info button next to the band you liked for event details and you're all set to go see live music.",
  },
  {
    question: 'How do I get playlists in my account?',
    answer: `<strong>Follow public playlists</strong> - NearHear maintains a "Tonight" playlist, as well as other genre, venue, and time frame specific playlists. Click the heart in Spotify to add these to your library so you always have them handy. They're always up to date, so you are too.<br><br><strong>Build your own playlists</strong> - Use our custom playlists to customize a playlist to your tastes. Filter by date range, venue, and genre to curate your experience. Only you can see these playlists unless you actively share them from within Spotify.<br><br><strong>Event listings</strong> - Browse our Event Listings and use the audio previews to hear a sample from each band.`,
  },
  {
    question: 'How is NearHear different from things like BandsInTown?',
    answer:
      "Most other services alert you to bands you already know you like, and then predict what else you'll like based on that. That's not bad, but it can create a bit of a feedback loop and you can end up stuck in a rut. NearHear is all about discovering new-to-you bands, by helping you listen to them. By focusing on upcoming concerts rather than what you know you like, NearHear broadens your options and helps you become more involved in your city's music community. Your local music scene is so much more than medium-large touring bands. Get to know the entire scene with NearHear, and support artists and venues by going to shows.",
  },
  {
    question: 'Why Spotify?',
    answer:
      "We're not affiliated with Spotify. We chose to start building NearHear using Spotify because it is a popular streaming service and has functionality we needed to bring our vision to life. In the future, we'll expand to more streaming services.",
  },
  {
    question: 'Why do I have to log in to Spotify? How does that work?',
    answer:
      "When you create a custom playlist we need your permission to add playlists to your account. We require Spotify authentication to add events to prevent spam by bots. You always authenticate with Spotify, not NearHear, so we never see your credentials. You do not need to authenticate to use the pre-built playlists and audio previews. If you'd like to follow our public playlists without authenticating you can do that in Spotify.",
  },
  {
    question: "What if I don't have Spotify?",
    answer:
      'If you would like a Spotify account they have a free option. If you\'re not interested in creating an account, you can listen to the 30 second audio previews without an account. Email us at <a href="mailto:feedback@nearhear.app" class="link-primary">feedback@nearhear.app</a> to let us know what your preferred streaming service is so we know where to go next.',
  },
  {
    question: "Why don't you have the genre I'm looking for?",
    answer:
      "The calendar only displays genres that are represented in the date range you selected. Try a different date range to see more genre options. The top-level genres you see by default are determined from Spotify's super specific genres using some computer magic, and we all know how computers can be; try relaxing your criteria. Or get real nerdy with the advanced genre filters.",
  },
  {
    question: "I know of an event that I don't see listed.",
    answer:
      'Awesome! Add it in the <a href="/add-events" class="link-primary">Add Event</a> section. It\'s totally free to add events, you just need to link your Spotify account so we know you\'re not a bot. We love all live music, so don\'t be shy! The event link can be anything - a tweet, facebook event, etc, anything that will let other users know where to get more information. Only artists with music on Spotify will currently appear on NearHear. Enter artist names as they appear on Spotify, or enter the link to the artist on Spotify (it will look like this https://open.spotify.com/artist/7CoMFVivBVRoaf3UrMFMKf)',
  },
  {
    question: 'How do I get events listed on NearHear?',
    answer:
      'If you have one-off events, add them in the <a href="/add-events" class="link-primary">Add Event</a> section. If you\'re looking for a more ongoing relationship (venue, promoter, artist, etc), shoot us an email at <a href="mailto:shows@nearhear.app" class="link-primary">shows@nearhear.app</a> and we\'ll be in touch.',
  },
  {
    question: "I don't see my city listed.",
    answer:
      "NearHear is currently focusing on Portland Oregon, where we live. Let us know where you'd like to see us next.",
  },
  {
    question: 'Why is my band missing from the corresponding genre playlist?',
    answer:
      "We get our genre data from Spotify, if you don't have genre data with them then we don't either.",
  },
  {
    question: "How can I promote my band's shows?",
    answer:
      'You can add your band\'s show (or any show!) to the NearHear calendar on our <a href="/add-events" class="link-primary">Add Event</a> page. Your show will appear on the website, in the daily and weekly playlists, in the weekly email we send out, and, if Spotify has genre data for your band it will also appear in the genre playlists.',
  },
  {
    question: 'Where can I get concert listings by genre?',
    answer:
      'NearHear has comprehensive concert listings and allows you to filter by genre to find your next show. On the <a href="/calendar" class="link-primary">Calendar Page</a> click the \'Filter Genres\' button to get started.',
  },
];

// Track which FAQ is open (null = all closed)
const openIndex = ref<number | null>(null);

const toggleFaq = (index: number) => {
  openIndex.value = openIndex.value === index ? null : index;
};
</script>

<template>
  <section>
    <PageHeader title="Frequently Asked Questions" />

    <div class="mx-auto mt-8 max-w-3xl">
      <p class="text-base-content/70 mb-8 text-center text-lg">
        Everything you need to know about discovering live music with NearHear
      </p>

      <!-- FAQ Accordion -->
      <div class="space-y-3">
        <div
          v-for="(faq, index) in faqs"
          :key="index"
          class="collapse collapse-arrow rounded-lg border border-base-300 bg-base-100"
          :class="{ 'collapse-open': openIndex === index }"
        >
          <input
            type="radio"
            name="faq-accordion"
            :checked="openIndex === index"
            @click="toggleFaq(index)"
          />
          <div class="collapse-title pr-12 text-base font-semibold">
            {{ faq.question }}
          </div>
          <div class="collapse-content">
            <p class="text-base-content/80 leading-relaxed" v-html="faq.answer"></p>
          </div>
        </div>
      </div>

      <!-- Contact Section -->
      <div class="border-primary/30 bg-primary/5 mt-12 rounded-xl border p-6 text-center">
        <h2 class="mb-2 text-xl font-semibold">Still have questions?</h2>
        <p class="text-base-content/70 mb-4">
          We'd love to hear from you. Reach out and we'll get back to you as soon as we can.
        </p>
        <a
          href="mailto:feedback@nearhear.app"
          class="btn-action-solid"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-5 w-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          Contact Us
        </a>
      </div>
    </div>
  </section>
</template>
