What we are creating:
  A social media type application for stakes and wards of the church of jesus christ of latter day saints.

The problem we are solving:
  Stakes and wards don't have a central place to manage and promote announcements, events, forms, polls, etc. Currently, things are managed by word of mouth with the occasional print hand out. If a stake president has an event they want to promote, they send representatives to each ward on sunday where they share the event. They might send out an email blast, but not many read. If a ward has announcements or events, they have a similar solution, of sunday announcements during sacrament, maybe a printed handout, and that is it. 
  
  There is also no feedback mechanism, so sometimes turn out is low because of conflicts that could have been resolved had feedback been possible. 
  
  There is also a language barrier, where some wards are not english speaking.
  
  There are also occassion where a member would like to make a helpful announcement, for example; A member has some furniture they are wanting to give away. They would prioritize members, but have limited reach. On such occassions, they could make a post, and on bishop approval, it would be made public and could be pushed to the stake level for further reach. From there, members can reach our with more information directly to the member. A translation mechanism could also take place, where an english member can post and spanish readers can see the post translated. DMs can be translated too.
  
  We will need to have different views, like one for stake posts, one for ward posts. There would be a visitation feature where a user from one ward can visit another wards page. The state of the app will need to be in the url, this way url sharing works.
  
  A moderation view would need to be made for bishopbric members, ward and stake clerks, etc. Where they can review posts before publishing them. And making sure comments on posts are appropriate. We can leverage ai review first for obvious filtering and it can pass it on to manual review if needed
  
  This can be hosted in the web app in this monorepo. We will use NEXTJS, Turborepo, bun, tailwind, shadcn, convex, clerk, shadcn, remotion, tiptap, chatgpt for translations (pick the model for me).
  
We will also be building something I call the recording angel api. We will use hono, bun, convex or postgres (let me know what is better, is postgres, we can use drizzle orm and neondb). Its purpose is to take a webrtc stream and translate it to a desired language in real time. It returns text only to the client. For now the only client would be the we app. But I can imagine a mobile app for this later. 

For the web app, we will call this a live visit feature. This way, if a member attends or visits a non english speaking ward, they can read what the person is saying. This will work like a zoom web meeting, where a bishop starts a session and connects the microphone to their phone. At the enterance, he then shares a join code for other to join. They there read the text. At the end, we archive the text for future reading.

For now we can secure the api with api keys

For now, the app is open for anyone to register, but will be allowed to join a ward and stake on bishop approval.

There needs to be role based permissions with flexibility. For example, a bishop would be considered a ward admin, he can create a custom role and delgate certain permission for that role. 

This is a good start, we will add features to this down the line, so keep that in mind. Be efficient, if a component we create is likely to be reusable, lets make it so. Lets focus on setting up good primitives that can be easily expanded.
