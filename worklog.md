Ask AI to:
- clean up graph_service.py and structure them in order. Same name convention.

Open questions
- Should category be more like tags? So items can have multiple tags at a given time? 
- How do we add similarity between items? For example, Abbey Road is made by The Beatles, but wouldn't show in "influenced by".
- When new items are added to the graph, how should the cluster categories then be defined? From early main item to next main item? 

Bugs found
- We need to be able to insert years before 0.
- In proposal system; new items usually don't have year. Also we need to add "add years" and conflict resolution to that. 

# Things i like
1.
I like this idea.. Could i restructure my app in such a way? https://monadical.com/posts/vibe-code-how-to-stay-in-control.html?utm_source=tldrnewsletter#
The High-Level View

Before scaring managers and leads with implementation details, here’s the conceptual framework:

    Interface packages - Define contracts, data shapes, and the most important tests (human-written)
    Implementation packages - Fulfill those constraints (Vibe-generated, marked as @vibe-coded in README or in files)
    Clear dependency direction - Implementation depends on interfaces, never the reverse
    Regeneration freedom - Any @vibe-coded package can be deleted and rewritten without fear

2.
For clustering

def generate_graph_clusters(center_item, all_items, all_influences):
    prompt = f"""
    You have a graph with {center_item} at the center, connected to {all_items}.
    
    Create semantic clusters that make sense for this ENTIRE network, 
    not just individual items.
    
    Consider how influences flow through the network and group related 
    influence chains together.
    """



# What did i learn from coding this with AI
1.
Longest debugging session about filtering on an API endpoint. It ended up saying something was weird because 2 queries didn't add up, but the queries weren't exactly the same. One had an Optional param about categories that i tried to remove, and then it worked. It tried leading me down all sorts of issues with neo4j. "Known" issues. Database caching. It could have gotten ugly. 

2. 
Ask Claude what to include in new chats for maximising context. 

3.
It would be fun to see if i can one shot this application at the end with everything i know now.

4. 
It didn't always learn from mistakes. Escaping curly brackets in langchain was an issue every time it had to create the same type of agent. 

5. 
As a junior learning to program all i did was using boilerplate templates following tutorials, trying to add to them using stack overflow and few things i learned from courses. 
Now I'm going through full stack development 100x faster. I actually get to see the edge cases that are causing troubles in real life programming (and not in small learning development). I get to reason about what impact my database schema has, the consequences of doing things in one way versus another, adding observability to programs, etc. I could maybe do one of these projects a year, now i can do one a month - at least. 

6.
If I don't understand my codebase, then the AI will make mistakes.

7.
I don't see how I would learn this much from learning to develop everything myself. When i learned programming 6 years ago i only created very simple to do app ish type things. Now I'm attempting to make full stack production ready stuff. Learning to iterate, not just write functions.

In the future there might be programmers ones who understand computer science and those who don't?

8. 
I don't know how to write any db queries without AI. Why is that important? 

9. 
Could /save & /force-save become 1 if using a recursive statement? That shows i'm actually learning to use the things from boot.dev

10.
Cursor works better for restructuring code. They did fuck up a restructure by putting an api endpoint under export const proposalApi instead of export const api, and didn't solve it in other files. 


# What interesting influence links could be
1. 
How The Streets have influenced music
- Influences danish artists like Suspekt making Proletar. Probably in other countries as well.
- Even in 2025 we see it in Little Simz's new album.

2.
Imagine someone making a search query: Find all nano influences Kendrick Lamar has used and then it just explodes with hundres of small interesting things where he captures small bits from. Shows how everything is made up of everything before (remixed in new ways). 

3. Adding new influences to new items (let's say a new Little Simz album) could make the system into something that is up to date with latest things - different than most LLMs. This can only happen if we can update it with latest, or get community to add to new items. 

4. 
How nature influences tech? Everything?

5. 
What everything in Zelda is influenced by. With images, etc. 